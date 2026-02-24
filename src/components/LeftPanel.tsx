import { useRef, useState, useEffect } from 'react'
import VoiceButton from './VoiceButton'
import './LeftPanel.css'

interface LeftPanelProps {
  onLog?: (type: 'system' | 'event', msg: string) => void
  isListening?: boolean
  onListeningChange?: (listening: boolean) => void
  onTranscript?: (text: string) => void
}

export default function LeftPanel({ onLog, isListening = false, onListeningChange, onTranscript }: LeftPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCamActive, setIsCamActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [stream])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      setStream(mediaStream)
      if (videoRef.current) videoRef.current.srcObject = mediaStream
      setIsCamActive(true)
      setCapturedImage(null)
      onLog?.('event', 'Camera started')
    } catch (err) {
      onLog?.('system', 'Camera error: access denied or unavailable')
    }
  }

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop())
    onLog?.('event', 'Camera stopped')
    setStream(null)
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCamActive(false)
    setCapturedImage(null)
  }

  const captureFrame = () => {
    if (!videoRef.current || !isCamActive) return
    onLog?.('event', 'Frame captured')
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    setCapturedImage(canvas.toDataURL('image/png'))
  }

  const clearCapture = () => setCapturedImage(null)

  return (
    <div className="left-panel">
      <div className="panel-header">
        <span>LIVE FEED</span>
        <div className="header-line" />
      </div>
      <div className="feed-area">
        {capturedImage ? (
          <img src={capturedImage} alt="Captured" className="feed-media" />
        ) : isCamActive ? (
          <video ref={videoRef} autoPlay playsInline muted className="feed-media" />
        ) : (
          <div className="feed-placeholder">
            <span>No active feed</span>
            <span className="placeholder-hint">Start camera to begin</span>
          </div>
        )}
      </div>
      <div className="action-buttons">
        <button
          onClick={isCamActive ? stopCamera : startCamera}
          className={isCamActive ? 'btn-stop' : 'btn-start'}
        >
          {isCamActive ? 'Stop Camera' : 'Start Camera'}
        </button>
        <button
          onClick={captureFrame}
          disabled={!isCamActive}
          className="btn-action"
        >
          Capture
        </button>
        <button
          onClick={clearCapture}
          disabled={!capturedImage}
          className="btn-action"
        >
          Clear
        </button>
        {onListeningChange && onTranscript && (
          <VoiceButton
            isListening={isListening}
            onListeningChange={onListeningChange}
            onTranscript={onTranscript}
          />
        )}
      </div>
    </div>
  )
}
