import { useState, useCallback, useRef, useEffect } from 'react'
import JarvisOrb from './components/JarvisOrb'
import ChatPanel from './components/ChatPanel'
import LeftPanel from './components/LeftPanel'
import LogsPanel, { type LogEntry } from './components/LogsPanel'
import AuthScreen from './components/AuthScreen'
import { useChatMutation, type Message } from './api'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './App.css'

const MOCK_RESPONSES = [
  "At your service. How may I assist you today?",
  "Processing your request. I'm always here to help.",
  "An excellent question. Allow me to elaborate...",
]

function formatTime() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const useBackend = !!import.meta.env.VITE_API_URL

function MainApp() {
  const { user, logout } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logIdRef = useRef(0)

  const chatMutation = useChatMutation()

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    logIdRef.current += 1
    setLogs(prev => [...prev, {
      id: `log-${logIdRef.current}`,
      time: formatTime(),
      type,
      message
    }])
  }, [])

  useEffect(() => {
    addLog('system', `J.A.R.V.I.S. initialized${user ? ` • Welcome, ${user.name}` : ''}`)
  }, [addLog, user])

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || chatMutation.isPending) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    addLog('user', text.trim())
    setInput('')
    try {
      let response: string
      if (useBackend) {
        response = await chatMutation.mutateAsync(nextMessages)
      } else {
        await new Promise(r => setTimeout(r, 600 + Math.random() * 300))
        const lastUser = nextMessages[nextMessages.length - 1]
        response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)] +
          (lastUser ? ` (You said: "${lastUser.content.slice(0, 40)}...")` : '')
      }
      setMessages(m => [...m, { role: 'assistant', content: response }])
      addLog('assistant', response.slice(0, 80) + (response.length > 80 ? '...' : ''))
    } catch {
      const errMsg = 'I encountered an error. Please check your API key or try again.'
      setMessages(m => [...m, { role: 'assistant', content: errMsg }])
      addLog('system', 'Error: API request failed')
    }
  }, [messages, chatMutation, addLog])

  const handleVoiceTranscript = useCallback((transcript: string) => {
    if (transcript.trim()) {
      addLog('event', `Voice: "${transcript.slice(0, 50)}${transcript.length > 50 ? '...' : ''}"`)
      handleSend(transcript)
    }
  }, [handleSend, addLog])

  return (
    <div className="app">
      <div className="grid-bg" />
      <header className="header">
        <h1 className="logo">J.A.R.V.I.S.</h1>
        <span className="subtitle">Just A Rather Very Intelligent System</span>
        <div className="header-right">
          {user && <span className="user-name">{user.name}</span>}
          {useBackend && user && (
            <button onClick={logout} className="logout-btn">Logout</button>
          )}
          <div className="status">
            <span className="status-dot" />
            <span>Online</span>
          </div>
        </div>
      </header>
      <main className="main three-column">
        <aside className="panel-left">
          <LeftPanel
            onLog={(type, msg) => addLog(type, msg)}
            isListening={isListening}
            onListeningChange={setIsListening}
            onTranscript={handleVoiceTranscript}
            onDocAnswer={(answer) => {
              setMessages(m => [...m, { role: 'assistant', content: `📄 ${answer}` }])
              addLog('assistant', answer.slice(0, 80) + (answer.length > 80 ? '...' : ''))
            }}
          />
        </aside>
        <section className="panel-center">
          <div className="jarvis-section">
            <JarvisOrb isListening={isListening} isThinking={chatMutation.isPending} />
          </div>
          <ChatPanel
            messages={messages}
            input={input}
            setInput={setInput}
            onSend={handleSend}
            isThinking={chatMutation.isPending}
          />
        </section>
        <aside className="panel-right">
          <LogsPanel logs={logs} />
        </aside>
      </main>
    </div>
  )
}

function App() {
  const { user, isReady } = useAuth()

  if (!isReady) {
    return (
      <div className="app app-loading">
        <span>Loading...</span>
      </div>
    )
  }

  if (useBackend && !user) {
    return <AuthScreen />
  }

  return <MainApp />
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}
