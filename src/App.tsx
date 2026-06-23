import { useState, useCallback, useRef, useEffect } from 'react'
import JarvisOrb from './components/JarvisOrb'
import JarvisAvatar, { type JarvisAvatarHandle } from './components/JarvisAvatar'
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
const DISPLAY_MODE_KEY = 'jarvis-display-mode'

type DisplayMode = 'orb' | 'avatar'

function loadDisplayMode(): DisplayMode {
  try {
    return localStorage.getItem(DISPLAY_MODE_KEY) === 'avatar' ? 'avatar' : 'orb'
  } catch {
    return 'orb'
  }
}

function MainApp() {
  const { user, logout } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('male')
  const [displayMode, setDisplayMode] = useState<DisplayMode>(loadDisplayMode)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logIdRef = useRef(0)
  const startVoiceListeningRef = useRef<(() => void) | null>(null)
  const cancelSpeakingRef = useRef<(() => void) | null>(null)
  const avatarRef = useRef<JarvisAvatarHandle>(null)

  const chatMutation = useChatMutation()

  useEffect(() => {
    cancelSpeakingRef.current = () => {
      avatarRef.current?.stop()
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

  useEffect(() => {
    try {
      localStorage.setItem(DISPLAY_MODE_KEY, displayMode)
    } catch {
      // ignore storage errors
    }
  }, [displayMode])

  const hasDevanagari = (s: string) => /[\u0900-\u097F]/.test(s)

  const isFemaleVoice = (name: string) => {
    const n = name.toLowerCase()
    return /female|woman|zira|samantha|karen|victoria|hilary|moira|kate|fiona|kalyani|heera/.test(n)
  }

  const filterByGender = (voices: SpeechSynthesisVoice[], gender: 'male' | 'female') =>
    gender === 'female'
      ? voices.filter(v => isFemaleVoice(v.name))
      : voices.filter(v => !isFemaleVoice(v.name))

  const speakResponse = useCallback((text: string, onEnd?: () => void) => {
    if (!text.trim()) return

    if (displayMode === 'avatar') {
      void avatarRef.current?.speak(text, onEnd)
      return
    }

    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.volume = 1
    const voices = window.speechSynthesis.getVoices()
    const hindiVoices = filterByGender(voices.filter(v => v.lang.startsWith('hi')), voiceGender)
    const englishVoices = filterByGender(voices.filter(v => v.lang.startsWith('en')), voiceGender)
    const useHindi = hasDevanagari(text)
    const candidates = useHindi && hindiVoices.length ? hindiVoices : englishVoices
    const fallback = useHindi ? voices.find(v => v.lang.startsWith('hi')) : voices.find(v => v.lang.startsWith('en'))
    const chosen = candidates[0] ?? fallback ?? voices[0]
    if (chosen) utterance.voice = chosen
    utterance.lang = useHindi ? 'hi-IN' : 'en-US'
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
  }, [voiceGender, displayMode])

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
    } catch (err) {
      const errMsg = err instanceof Error && err.message
        ? err.message
        : 'I encountered an error. Please try again.'
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
            voiceGender={voiceGender}
            onVoiceGenderChange={setVoiceGender}
            onDocAnswer={(answer) => {
              setMessages(m => [...m, { role: 'assistant', content: `📄 ${answer}` }])
              addLog('assistant', answer.slice(0, 80) + (answer.length > 80 ? '...' : ''))
            }}
          />
        </aside>
        <section className="panel-center">
          <div className="jarvis-section">
            <div className="display-mode-toggle">
              <span className="display-mode-label">Display</span>
              <button
                type="button"
                className={displayMode === 'orb' ? 'active' : ''}
                onClick={() => setDisplayMode('orb')}
                title="Circular orb"
              >
                Orb
              </button>
              <button
                type="button"
                className={displayMode === 'avatar' ? 'active' : ''}
                onClick={() => setDisplayMode('avatar')}
                title="Talking avatar with lip-sync"
              >
                Avatar
              </button>
            </div>
            {displayMode === 'orb' ? (
              <JarvisOrb isListening={isListening} isThinking={chatMutation.isPending} isSpeaking={isSpeaking} />
            ) : (
              <JarvisAvatar
                ref={avatarRef}
                isListening={isListening}
                isThinking={chatMutation.isPending}
                isSpeaking={isSpeaking}
                voiceGender={voiceGender}
                onSpeakingChange={setIsSpeaking}
              />
            )}
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
