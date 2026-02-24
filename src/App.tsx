import { useState, useCallback } from 'react'
import JarvisOrb from './components/JarvisOrb'
import ChatPanel from './components/ChatPanel'
import VoiceButton from './components/VoiceButton'
import { sendMessage, type Message } from './lib/ai'
import './App.css'

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isThinking, setIsThinking] = useState(false)

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setIsThinking(true)
    try {
      const response = await sendMessage([...messages, userMsg])
      setMessages(m => [...m, { role: 'assistant', content: response }])
    } catch (err) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'I encountered an error. Please check your API key or try again.'
      }])
    } finally {
      setIsThinking(false)
    }
  }, [messages, isThinking])

  const handleVoiceTranscript = useCallback((transcript: string) => {
    if (transcript.trim()) handleSend(transcript)
  }, [handleSend])

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
      <main className="main">
        <div className="orb-section">
          <JarvisOrb isListening={isListening} isThinking={isThinking} />
          <VoiceButton
            isListening={isListening}
            onListeningChange={setIsListening}
            onTranscript={handleVoiceTranscript}
          />
        </div>
        <ChatPanel
          messages={messages}
          input={input}
          setInput={setInput}
          onSend={handleSend}
          isThinking={isThinking}
        />
      </main>
    </div>
  )
}

export default App
