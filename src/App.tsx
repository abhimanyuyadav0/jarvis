import { useState, useCallback, useRef, useEffect } from 'react'
import JarvisOrb from './components/JarvisOrb'
import ChatPanel from './components/ChatPanel'
import LeftPanel from './components/LeftPanel'
import LogsPanel, { type LogEntry } from './components/LogsPanel'
import AuthScreen from './components/AuthScreen'
import { useChatMutation, type Message } from './api'
import { setOnUnauthorized } from './api'
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
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logIdRef = useRef(0)
  const startVoiceListeningRef = useRef<(() => void) | null>(null)
  const cancelSpeakingRef = useRef<(() => void) | null>(null)

  const chatMutation = useChatMutation()

  useEffect(() => {
    cancelSpeakingRef.current = () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

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

  const speakResponse = useCallback((text: string, onEnd?: () => void) => {
    if (!text.trim() || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.volume = 1
    const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'))
    if (voices.length) utterance.voice = voices[0]
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      onEnd?.()
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
      onEnd?.()
    }
    window.speechSynthesis.speak(utterance)
  }, [])

  const handleSend = useCallback(async (text: string, replyWithVoice = false) => {
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
      if (replyWithVoice) {
        speakResponse(response, () => {
          setTimeout(() => startVoiceListeningRef.current?.(), 400)
        })
      }
    } catch {
      const errMsg = 'I encountered an error. Please check your API key or try again.'
      setMessages(m => [...m, { role: 'assistant', content: errMsg }])
      addLog('system', 'Error: API request failed')
      if (replyWithVoice) {
        speakResponse(errMsg, () => {
          setTimeout(() => startVoiceListeningRef.current?.(), 400)
        })
      }
    }
  }, [messages, chatMutation, addLog, speakResponse])

  const handleVoiceTranscript = useCallback((transcript: string) => {
    if (transcript.trim()) {
      setIsListening(false)
      addLog('event', `Voice: "${transcript.slice(0, 50)}${transcript.length > 50 ? '...' : ''}"`)
      handleSend(transcript, true)
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
            startVoiceListeningRef={startVoiceListeningRef}
            cancelSpeakingRef={cancelSpeakingRef}
            onDocAnswer={(answer) => {
              setMessages(m => [...m, { role: 'assistant', content: `📄 ${answer}` }])
              addLog('assistant', answer.slice(0, 80) + (answer.length > 80 ? '...' : ''))
            }}
          />
        </aside>
        <section className="panel-center">
          <div className="jarvis-section">
            <JarvisOrb isListening={isListening} isThinking={chatMutation.isPending} isSpeaking={isSpeaking} />
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
  const { user, isReady, logout } = useAuth()

  useEffect(() => {
    setOnUnauthorized(logout)
    return () => setOnUnauthorized(null)
  }, [logout])

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
