# ─────────────────────────────────────────────────────────────────────────────
# DocMind — AI Document Assistant (Gemini edition)
#
# Setup:
#   1. Get a free API key at https://aistudio.google.com/apikey
#   2. export GEMINI_API_KEY="your-key-here"
#   3. uvicorn main:app --reload
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
import io
import os

# ── Optional parsers ──────────────────────────────────────────────────────────
try:
    import fitz          # PyMuPDF
    HAS_PDF = True
except ImportError:
    HAS_PDF = False

try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="DocMind — AI Document Assistant (Gemini)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Gemini client ─────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY environment variable not set.\n"
        "Get a free key at https://aistudio.google.com/apikey\n"
        "Then run: export GEMINI_API_KEY='your-key-here'"
    )

client = genai.Client(api_key=GEMINI_API_KEY)

# Gemini 2.0 Flash — fast, cheap, great for document Q&A
GEMINI_MODEL = "gemini-2.5-flash"
# ── In-memory document store (resets on server restart) ──────────────────────
document_store: dict[str, str] = {}


# ── Request models ────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: str
    question: str

class SummarizeRequest(BaseModel):
    session_id: str


# ── Helpers ───────────────────────────────────────────────────────────────────
def extract_text(file_bytes: bytes, filename: str) -> str:
    """Extract plain text from PDF, DOCX, or TXT files."""
    ext = filename.lower().rsplit(".", 1)[-1]

    if ext == "pdf":
        if not HAS_PDF:
            raise HTTPException(400, "PyMuPDF not installed. Run: pip install pymupdf")
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)

    elif ext in ("docx", "doc"):
        if not HAS_DOCX:
            raise HTTPException(400, "python-docx not installed. Run: pip install python-docx")
        document = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in document.paragraphs if p.text.strip())

    elif ext == "txt":
        return file_bytes.decode("utf-8", errors="ignore")

    else:
        raise HTTPException(400, f"Unsupported file type: .{ext}. Use PDF, DOCX, or TXT.")


def ask_gemini(prompt: str) -> str:
    """Send a prompt to Gemini and return the text response."""
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )
    return response.text


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "DocMind (Gemini) is running 🚀", "model": GEMINI_MODEL}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a PDF, DOCX, or TXT file. Returns a session_id to use in chat."""
    contents = await file.read()

    if len(contents) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(400, "File too large. Max size is 10MB.")

    text = extract_text(contents, file.filename)

    if not text.strip():
        raise HTTPException(400, "Could not extract any text from this file.")

    session_id = file.filename.replace(" ", "_")
    document_store[session_id] = text[:50_000]  # cap at ~50k chars

    word_count = len(text.split())
    return {
        "session_id": session_id,
        "filename": file.filename,
        "word_count": word_count,
        "preview": text[:300] + "..." if len(text) > 300 else text,
    }


@app.post("/chat")
def chat_with_document(req: ChatRequest):
    """Ask any question about the uploaded document."""
    doc_text = document_store.get(req.session_id)
    if not doc_text:
        raise HTTPException(404, "Session not found. Please upload a document first.")

    prompt = (
        "You are a helpful document assistant. "
        "Answer the question below based ONLY on the document content provided. "
        "If the answer isn't in the document, say so clearly.\n\n"
        f"DOCUMENT CONTENT:\n{doc_text}\n\n"
        f"QUESTION: {req.question}"
    )

    answer = ask_gemini(prompt)
    return {"answer": answer, "session_id": req.session_id}


@app.post("/summarize")
def summarize_document(req: SummarizeRequest):
    """Generate a structured summary with key points."""
    doc_text = document_store.get(req.session_id)
    if not doc_text:
        raise HTTPException(404, "Session not found. Please upload a document first.")

    prompt = (
        "You are an expert document summarizer.\n"
        "Summarize the document below. Return:\n"
        "1. A 2-3 sentence overview\n"
        "2. 5 key points as bullet points\n"
        "3. Main topics covered\n\n"
        f"DOCUMENT:\n{doc_text}"
    )

    summary = ask_gemini(prompt)
    return {"summary": summary, "session_id": req.session_id}


@app.delete("/session/{session_id}")
def clear_session(session_id: str):
    """Remove a document from memory."""
    if session_id in document_store:
        del document_store[session_id]
        return {"message": "Session cleared."}
    raise HTTPException(404, "Session not found.")
