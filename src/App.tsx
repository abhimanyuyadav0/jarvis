import { useState, useCallback, useRef, useEffect } from 'react'
import JarvisOrb from './components/JarvisOrb'
import ChatPanel from './components/ChatPanel'
import LeftPanel from './components/LeftPanel'
import LogsPanel, { type LogEntry } from './components/LogsPanel'
import { sendMessage, type Message } from './lib/ai'
import './App.css'

function formatTime() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logIdRef = useRef(0)

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
    addLog('system', 'J.A.R.V.I.S. initialized')
  }, [addLog])

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    setMessages(m => [...m, userMsg])
    addLog('user', text.trim())
    setInput('')
    setIsThinking(true)
    try {
      const response = await sendMessage([...messages, userMsg])
      setMessages(m => [...m, { role: 'assistant', content: response }])
      addLog('assistant', response.slice(0, 80) + (response.length > 80 ? '...' : ''))
    } catch (err) {
      const errMsg = 'I encountered an error. Please check your API key or try again.'
      setMessages(m => [...m, { role: 'assistant', content: errMsg }])
      addLog('system', 'Error: API request failed')
    } finally {
      setIsThinking(false)
    }
  }, [messages, isThinking, addLog])

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
        <div className="status">
          <span className="status-dot" />
          <span>Online</span>
        </div>
      </header>
      <main className="main three-column">
        <aside className="panel-left">
          <LeftPanel
            onLog={(type, msg) => addLog(type, msg)}
            isListening={isListening}
            onListeningChange={setIsListening}
            onTranscript={handleVoiceTranscript}
          />
        </aside>
        <section className="panel-center">
          <div className="jarvis-section">
            <JarvisOrb isListening={isListening} isThinking={isThinking} />
          </div>
          <ChatPanel
            messages={messages}
            input={input}
            setInput={setInput}
            onSend={handleSend}
            isThinking={isThinking}
          />
        </section>
        <aside className="panel-right">
          <LogsPanel logs={logs} />
        </aside>
      </main>
    </div>
  )
}

export default App
