import './JarvisOrb.css'

interface JarvisOrbProps {
  isListening?: boolean
  isThinking?: boolean
}

export default function JarvisOrb({ isListening = false, isThinking = false }: JarvisOrbProps) {
  return (
    <div className={`jarvis-orb ${isListening ? 'listening' : ''} ${isThinking ? 'thinking' : ''}`}>
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
