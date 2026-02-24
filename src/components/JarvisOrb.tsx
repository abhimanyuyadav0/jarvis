import './JarvisOrb.css'

interface JarvisOrbProps {
  isListening?: boolean
  isThinking?: boolean
  isSpeaking?: boolean
}

export default function JarvisOrb({ isListening = false, isThinking = false, isSpeaking = false }: JarvisOrbProps) {
  // Speaking overrides other states for visual feedback
  return (
    <div className={`jarvis-orb ${isSpeaking ? 'speaking' : ''} ${isListening && !isSpeaking ? 'listening' : ''} ${isThinking && !isSpeaking ? 'thinking' : ''}`}>
      <div className="orb-rings">
        <div className="ring ring-1" />
        <div className="ring ring-2" />
        <div className="ring ring-3" />
      </div>
      <div className="orb-core">
        <div className="orb-inner" />
      </div>
      <div className="orb-glow" />
    </div>
  )
}
