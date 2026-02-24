import { useRef, useState, useEffect } from 'react'
import VoiceButton from './VoiceButton'
import { faceAnalyzeBase64, uploadDocument, listDocuments } from '../lib/api'
import './LeftPanel.css'

interface LeftPanelProps {
  onLog?: (type: 'system' | 'event', msg: string) => void
  isListening?: boolean
  onListeningChange?: (listening: boolean) => void
  onTranscript?: (text: string) => void
  onDocAnswer?: (answer: string) => void
}

export default function LeftPanel({ onLog, isListening = false, onListeningChange, onTranscript, onDocAnswer }: LeftPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCamActive, setIsCamActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [docs, setDocs] = useState<{ id: string; filename: string }[]>([])
  const [docQuestion, setDocQuestion] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAskingDocs, setIsAskingDocs] = useState(false)

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [stream])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    video.srcObject = stream
    video.play().catch(() => {})
  }, [stream, isCamActive])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      setStream(mediaStream)
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

  const getVideoFrame = () => {
    if (!videoRef.current) return null
    const c = document.createElement('canvas')
    c.width = videoRef.current.videoWidth
    c.height = videoRef.current.videoHeight
    c.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    return c.toDataURL('image/jpeg')
  }

  const analyzeFace = async () => {
    const b64 = capturedImage ?? (isCamActive ? getVideoFrame() : null)
    if (!b64) {
      onLog?.('system', 'Start camera or capture a frame first')
      return
    }
    setIsAnalyzing(true)
    try {
      const res = await faceAnalyzeBase64(b64)
      onLog?.('event', `Faces detected: ${res.face_count}`)
      if (res.recognized && res.name) {
        onLog?.('event', `Recognized: ${res.name} (${(res.confidence * 100).toFixed(0)}%)`)
      }
    } catch {
      onLog?.('system', 'Face analysis failed. Is backend running?')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const loadDocs = async () => {
    try {
      const { documents } = await listDocuments()
      setDocs(documents || [])
    } catch {
      setDocs([])
    }
  }
  useEffect(() => { loadDocs() }, [])

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      await uploadDocument(file)
      onLog?.('event', `Uploaded: ${file.name}`)
      loadDocs()
    } catch (err) {
      onLog?.('system', err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const askDocs = async () => {
    if (!docQuestion.trim()) return
    setIsAskingDocs(true)
    try {
      const { answer } = await (await import('../lib/api')).queryDocuments(docQuestion)
      onDocAnswer?.(answer)
      setDocQuestion('')
    } catch {
      onLog?.('system', 'Document query failed. Is backend running?')
    } finally {
      setIsAskingDocs(false)
    }
  }

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
        <button
          onClick={analyzeFace}
          disabled={(!capturedImage && !isCamActive) || isAnalyzing}
          className="btn-action"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Face'}
        </button>
        {onListeningChange && onTranscript && (
          <VoiceButton
            isListening={isListening}
            onListeningChange={onListeningChange}
            onTranscript={onTranscript}
          />
        )}
      </div>
      <div className="documents-section">
        <div className="doc-header">DOCUMENTS</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.docx"
          onChange={handleDocUpload}
          style={{ display: 'none' }}
        />
        <button
          className="btn-action"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload PDF/TXT/DOCX'}
        </button>
        {docs.length > 0 && (
          <>
            <span className="doc-count">{docs.length} doc(s)</span>
            <div className="doc-ask">
              <input
                value={docQuestion}
                onChange={e => setDocQuestion(e.target.value)}
                placeholder="Ask about documents..."
                onKeyDown={e => e.key === 'Enter' && askDocs()}
              />
              <button onClick={askDocs} disabled={isAskingDocs || !docQuestion.trim()}>
                Ask
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
