import { useRef, useEffect } from 'react'
import type { Message } from '../api'
import './ChatPanel.css'

interface ChatPanelProps {
  messages: Message[]
  input: string
  setInput: (v: string) => void
  onSend: (text: string) => void
  isThinking: boolean
}

export default function ChatPanel({ messages, input, setInput, onSend, isThinking }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSend(input)
  }

  return (
    <div className="chat-panel">
      <div className="panel-header">
        <span>CONVERSATION</span>
        <div className="header-line" />
      </div>
      <div className="messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="welcome">
            <p>Welcome. I am J.A.R.V.I.S.</p>
            <p>How may I assist you today?</p>
            <p className="hint">Type a message or use voice input.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <span className="role-label">{m.role === 'user' ? 'You' : 'JARVIS'}</span>
            <p>{m.content}</p>
          </div>
        ))}
        {isThinking && (
          <div className="message assistant thinking">
            <span className="role-label">JARVIS</span>
            <p><span className="typing">Processing...</span></p>
          </div>
        )}
      </div>
      <form className="input-area" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask J.A.R.V.I.S. anything..."
          disabled={isThinking}
        />
        <button type="submit" disabled={isThinking || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
