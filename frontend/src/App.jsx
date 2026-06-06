import { useState, useRef } from "react"

const API = "http://localhost:8000"

const SUGGESTED_QUESTIONS = [
  "What is the main topic of this document?",
  "What are the key conclusions?",
  "List any important dates or deadlines mentioned.",
  "Who are the main people or organizations mentioned?",
]

export default function App() {
  const [session, setSession] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [summarizing, setSummarizing] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()
  const chatRef = useRef()

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError(null)
    setSummary(null)
    setMessages([])

    const form = new FormData()
    form.append("file", file)

    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setSession(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSummarize() {
    if (!session) return
    setSummarizing(true)
    setSummary(null)
    setError(null)
    try {
      const res = await fetch(`${API}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.session_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setSummary(data.summary)
    } catch (err) {
      setError(err.message)
    } finally {
      setSummarizing(false)
    }
  }

  async function handleChat(question) {
    const q = question || input.trim()
    if (!q || !session) return
    setInput("")
    setLoading(true)
    setError(null)

    const newMessages = [...messages, { role: "user", text: q }]
    setMessages(newMessages)

    setTimeout(() => chatRef.current?.scrollTo({ top: 9999, behavior: "smooth" }), 50)

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.session_id, question: q }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setMessages([...newMessages, { role: "assistant", text: data.answer }])
    } catch (err) {
      setError(err.message)
      setMessages(newMessages)
    } finally {
      setLoading(false)
      setTimeout(() => chatRef.current?.scrollTo({ top: 9999, behavior: "smooth" }), 100)
    }
  }

  function handleReset() {
    setSession(null)
    setSummary(null)
    setMessages([])
    setError(null)
    fileRef.current.value = ""
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", color: "#e8e6e0", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ borderBottom: "1px solid #2a2a2e", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: "#c9b99a", letterSpacing: "0.02em" }}>DocMind</span>
          <span style={{ marginLeft: 10, fontSize: 12, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" }}>AI Document Assistant</span>
        </div>
        {session && (
          <button onClick={handleReset} style={{ background: "none", border: "1px solid #333", color: "#888", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
            ✕ New document
          </button>
        )}
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>

        {/* Upload zone */}
        {!session ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 400, color: "#c9b99a", marginBottom: 12, lineHeight: 1.2 }}>
              Ask anything about<br /><em>any document.</em>
            </p>
            <p style={{ color: "#666", marginBottom: 40, fontSize: 15 }}>Upload a PDF, DOCX, or TXT file to get started</p>

            <label style={{
              display: "inline-block", cursor: "pointer",
              border: "1.5px dashed #333", borderRadius: 16,
              padding: "48px 64px", background: "#111113",
              transition: "border-color 0.2s"
            }}>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={handleUpload} style={{ display: "none" }} />
              {uploading ? (
                <div style={{ color: "#c9b99a", fontSize: 15 }}>⏳ Extracting text…</div>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                  <div style={{ color: "#c9b99a", fontWeight: 500, marginBottom: 6 }}>Drop your file here</div>
                  <div style={{ color: "#555", fontSize: 13 }}>PDF · DOCX · TXT — max 10MB</div>
                </>
              )}
            </label>
            {error && <p style={{ color: "#e07070", marginTop: 20, fontSize: 14 }}>⚠ {error}</p>}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>

            {/* Left — Chat */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Doc info bar */}
              <div style={{ background: "#111113", border: "1px solid #222", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: "#e8e6e0" }}>{session.filename}</div>
                  <div style={{ color: "#555", fontSize: 12 }}>{session.word_count.toLocaleString()} words extracted</div>
                </div>
              </div>

              {/* Suggested questions */}
              {messages.length === 0 && (
                <div>
                  <p style={{ color: "#555", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Suggested questions</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {SUGGESTED_QUESTIONS.map(q => (
                      <button key={q} onClick={() => handleChat(q)} style={{
                        background: "#111113", border: "1px solid #222", borderRadius: 10,
                        padding: "10px 14px", color: "#aaa", fontSize: 14, textAlign: "left",
                        cursor: "pointer", transition: "border-color 0.2s"
                      }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat messages */}
              {messages.length > 0 && (
                <div ref={chatRef} style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
                  {messages.map((m, i) => (
                    <div key={i} style={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      background: m.role === "user" ? "#1e1c2e" : "#111113",
                      border: `1px solid ${m.role === "user" ? "#2e2a45" : "#222"}`,
                      borderRadius: 12, padding: "12px 16px",
                      fontSize: 14, lineHeight: 1.7, color: "#ddd",
                      whiteSpace: "pre-wrap"
                    }}>
                      {m.role === "assistant" && <span style={{ fontSize: 11, color: "#c9b99a", display: "block", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>DocMind</span>}
                      {m.text}
                    </div>
                  ))}
                  {loading && (
                    <div style={{ alignSelf: "flex-start", background: "#111113", border: "1px solid #222", borderRadius: 12, padding: "12px 16px", color: "#555", fontSize: 14 }}>
                      Thinking…
                    </div>
                  )}
                </div>
              )}

              {/* Input */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChat()}
                  placeholder="Ask anything about this document…"
                  style={{
                    flex: 1, background: "#111113", border: "1px solid #2a2a2e",
                    borderRadius: 10, padding: "12px 16px", color: "#e8e6e0",
                    fontSize: 14, outline: "none"
                  }}
                />
                <button onClick={() => handleChat()} disabled={!input.trim() || loading} style={{
                  background: "#c9b99a", color: "#0d0d0f", border: "none",
                  borderRadius: 10, padding: "0 20px", fontWeight: 500, fontSize: 14,
                  cursor: "pointer", opacity: !input.trim() || loading ? 0.4 : 1
                }}>
                  Ask
                </button>
              </div>

              {error && <p style={{ color: "#e07070", fontSize: 13 }}>⚠ {error}</p>}
            </div>

            {/* Right — Summary panel */}
            <div style={{ background: "#111113", border: "1px solid #222", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: "#c9b99a" }}>Summary</div>

              {!summary && (
                <button onClick={handleSummarize} disabled={summarizing} style={{
                  background: "#1a1a1e", border: "1px solid #2a2a2e", color: "#c9b99a",
                  borderRadius: 10, padding: "12px", fontSize: 14, cursor: "pointer",
                  opacity: summarizing ? 0.6 : 1
                }}>
                  {summarizing ? "Summarizing…" : "✦ Generate summary"}
                </button>
              )}

              {summary && (
                <div style={{ fontSize: 13, lineHeight: 1.8, color: "#aaa", whiteSpace: "pre-wrap", overflowY: "auto", maxHeight: 500 }}>
                  {summary}
                </div>
              )}

              {/* Preview */}
              <div style={{ borderTop: "1px solid #1e1e22", paddingTop: 14 }}>
                <p style={{ color: "#444", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Document preview</p>
                <p style={{ color: "#444", fontSize: 12, lineHeight: 1.7, fontStyle: "italic" }}>{session.preview}</p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
