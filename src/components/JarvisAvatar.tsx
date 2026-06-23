import { forwardRef, useImperativeHandle, useRef, useCallback } from 'react'
import { TalkingHead, deriveAvatarState, type TalkingHeadHandle } from 'talky-heads-sdk'
import './JarvisAvatar.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export type JarvisAvatarHandle = {
  speak: (text: string, onEnd?: () => void) => Promise<void>
  stop: () => void
}

interface JarvisAvatarProps {
  isListening?: boolean
  isThinking?: boolean
  isSpeaking?: boolean
  voiceGender?: 'male' | 'female'
  onSpeakingChange?: (speaking: boolean) => void
}

const JarvisAvatar = forwardRef<JarvisAvatarHandle, JarvisAvatarProps>(function JarvisAvatar(
  { isListening = false, isThinking = false, isSpeaking = false, voiceGender = 'male', onSpeakingChange },
  ref,
) {
  const headRef = useRef<TalkingHeadHandle>(null)
  const onEndRef = useRef<(() => void) | undefined>()

  const avatarState = deriveAvatarState(
    isThinking,
    isSpeaking ? 'jarvis' : null,
    isListening && !isSpeaking,
  )

  const handleSpeakingChange = useCallback((speaking: boolean) => {
    onSpeakingChange?.(speaking)
    if (!speaking) {
      const onEnd = onEndRef.current
      onEndRef.current = undefined
      onEnd?.()
    }
  }, [onSpeakingChange])

  useImperativeHandle(ref, () => ({
    async speak(text: string, onEnd?: () => void) {
      if (!text.trim()) return
      headRef.current?.stop()
      onEndRef.current = onEnd

      try {
        const res = await fetch(`${API_BASE}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, gender: voiceGender }),
        })
        if (!res.ok) throw new Error('TTS failed')
        const audioBlob = await res.blob()
        headRef.current?.speak(text, audioBlob)
      } catch {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.onstart = () => onSpeakingChange?.(true)
          utterance.onend = () => handleSpeakingChange(false)
          utterance.onerror = () => handleSpeakingChange(false)
          window.speechSynthesis.speak(utterance)
          return
        }
        onEndRef.current = undefined
        onSpeakingChange?.(false)
        onEnd?.()
      }
    },
    stop() {
      headRef.current?.stop()
      onEndRef.current = undefined
    },
  }), [voiceGender, onSpeakingChange, handleSpeakingChange])

  return (
    <div className="jarvis-avatar-wrap">
      <div className={`jarvis-avatar-rings ${avatarState.toLowerCase()}`}>
        <div className="avatar-ring ring-1" />
        <div className="avatar-ring ring-2" />
        <div className="avatar-ring ring-3" />
      </div>
      <TalkingHead
        ref={headRef}
        avatarDir="/avatars/Lucy"
        shape="circle"
        state={avatarState}
        style={{ width: 180, height: 180 }}
        onSpeakingChange={handleSpeakingChange}
      />
    </div>
  )
})

export default JarvisAvatar
