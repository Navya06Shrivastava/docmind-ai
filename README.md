# DocMind — AI Document Assistant (Gemini Edition)

Upload any PDF, DOCX, or TXT and chat with it using Google Gemini AI.

## Project Structure

```
doc-assistant/
├── backend/
│   ├── main.py          ← FastAPI server (Gemini-powered)
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        └── App.jsx
```

---

## Step-by-step Setup

### 1. Get your Gemini API key (free)
1. Go to https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API key"
4. Copy the key — looks like: AIzaSy...

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Set your Gemini API key
export GEMINI_API_KEY="AIzaSy-your-key-here"   # Mac/Linux
# set GEMINI_API_KEY=AIzaSy-your-key-here       # Windows

# Start the server
uvicorn main:app --reload
# Runs at: http://localhost:8000
# API docs: http://localhost:8000/docs
```

### 3. Frontend

```bash
# New terminal window
cd frontend
npm install
npm run dev
# Runs at: http://localhost:5173
```

### 4. Open the app
Visit http://localhost:5173 — upload a PDF and start chatting!

---

## API Routes

| Method | Route | What it does |
|--------|-------|-------------|
| GET | `/` | Health check |
| POST | `/upload` | Upload file → returns session_id |
| POST | `/chat` | Ask a question about the document |
| POST | `/summarize` | Get structured summary |
| DELETE | `/session/{id}` | Clear document from memory |

## Model used
`gemini-2.0-flash` — fast, capable, and free-tier friendly.
