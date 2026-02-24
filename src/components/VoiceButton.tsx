import { useCallback, useEffect, useRef } from 'react'
import './VoiceButton.css'

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

interface VoiceButtonProps {
  isListening: boolean
  onListeningChange: (listening: boolean) => void
  onTranscript: (text: string) => void
  /** Ref to programmatically start listening (for continuous conversation) */
  startListeningRef?: React.MutableRefObject<(() => void) | null>
  /** Ref to cancel ongoing speech when user interrupts */
  cancelSpeakingRef?: React.MutableRefObject<(() => void) | null>
}

export default function VoiceButton({ isListening, onListeningChange, onTranscript, startListeningRef, cancelSpeakingRef }: VoiceButtonProps) {
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const startListening = useCallback(() => {
    cancelSpeakingRef?.current?.()
    if (isListening) return
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionClass) {
      onTranscript('Voice recognition is not supported in your browser. Try Chrome or Edge.')
      return
    }
    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1
      const transcript = event.results[last][0].transcript
      if (event.results[last].isFinal && transcript.trim()) {
        onTranscript(transcript.trim())
      }
    }

    recognition.onerror = () => onListeningChange(false)
    recognition.onend = () => onListeningChange(false)

    recognition.start()
    recognitionRef.current = recognition
    onListeningChange(true)
  }, [isListening, onListeningChange, onTranscript, cancelSpeakingRef])

  useEffect(() => {
    startListeningRef && (startListeningRef.current = startListening)
    return () => {
      startListeningRef && (startListeningRef.current = null)
    }
  }, [startListeningRef, startListening])

  useEffect(() => {
    if (!isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
  }, [isListening])

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      onListeningChange(false)
      return
    }
    startListening()
  }, [isListening, onListeningChange, startListening])

  return (
    <button
      className={`voice-btn ${isListening ? 'active' : ''}`}
      onClick={toggleListening}
      title={isListening ? 'Stop listening' : 'Start voice input'}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
      <span>{isListening ? 'Listening...' : 'Voice'}</span>
    </button>
  )
}
