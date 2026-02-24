import { useRef, useState, useEffect, useCallback } from 'react'
import {
  useAuthRegisterFace,
  useAuthRegisterComplete,
  useAuthLogin,
  useAuthValidateFace,
  apiClient,
  type AuthUser,
} from '../api'
import { useAuth } from '../contexts/AuthContext'
import './AuthScreen.css'

type Tab = 'login' | 'register'

export default function AuthScreen() {
  const [tab, setTab] = useState<Tab>('login')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [hasStream, setHasStream] = useState(false)
  const [verifiedImage, setVerifiedImage] = useState<string | null>(null)
  const [validateStatus, setValidateStatus] = useState<string>('')
  const [zoom, setZoom] = useState(1.4)
  const [faceRect, setFaceRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const validateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const faceTrackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isStoringFaceRef = useRef(false)

  const { login } = useAuth()
  const registerFaceMutation = useAuthRegisterFace()
  const registerCompleteMutation = useAuthRegisterComplete()
  const loginMutation = useAuthLogin()
  const validateMutation = useAuthValidateFace()

  const captureFace = useCallback((zoomLevel = zoom): string | null => {
    if (!videoRef.current?.videoWidth) return null
    const vw = videoRef.current.videoWidth
    const vh = videoRef.current.videoHeight
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    canvas.width = vw
    canvas.height = vh
    if (zoomLevel > 1) {
      const sw = vw / zoomLevel
      const sh = vh / zoomLevel
      const sx = (vw - sw) / 2
      const sy = (vh - sh) / 2
      ctx.drawImage(videoRef.current!, sx, sy, sw, sh, 0, 0, vw, vh)
    } else {
      ctx.drawImage(videoRef.current, 0, 0)
    }
    return canvas.toDataURL('image/jpeg')
  }, [zoom])

  const runFaceTrack = useCallback(async () => {
    const b64 = captureFace()
    if (!b64) return
    try {
      const res = await apiClient.faceAnalyze(b64)
      if (res.face_count === 1 && res.faces?.[0]) {
        const f = res.faces[0]
        const vw = videoRef.current?.videoWidth || 640
        const vh = videoRef.current?.videoHeight || 480
        setFaceRect({
          left: (f.x / vw) * 100,
          top: (f.y / vh) * 100,
          width: (f.width / vw) * 100,
          height: (f.height / vh) * 100,
        })
      } else {
        setFaceRect(null)
      }
    } catch {
      setFaceRect(null)
    }
  }, [captureFace])

  const runValidation = useCallback(
    async (isLoginFlow: boolean) => {
      if (isStoringFaceRef.current) return
      const b64 = captureFace()
      if (!b64) return
      try {
        const res = await validateMutation.mutateAsync(b64)
        if (isStoringFaceRef.current) return
        if (res.valid) {
          if (res.already_registered && res.existing_name) {
            if (isLoginFlow) {
              if (validateIntervalRef.current) {
                clearInterval(validateIntervalRef.current)
                validateIntervalRef.current = null
              }
              setValidateStatus('Recognized! Logging in...')
              try {
                const result = await loginMutation.mutateAsync(b64)
                login(result)
              } catch {
                setValidateStatus('Login failed. Try again.')
              }
            } else {
              setValidateStatus(`Already registered as ${res.existing_name}. Use Login instead.`)
              setVerifiedImage(null)
            }
          } else {
            if (isLoginFlow) {
              if (validateIntervalRef.current) {
                clearInterval(validateIntervalRef.current)
                validateIntervalRef.current = null
              }
              setValidateStatus('Face not registered. Please register first.')
              setVerifiedImage(null)
            } else {
              setValidateStatus('verified')
              setVerifiedImage(b64)
              // Keep interval running for register so we detect when face is lost
            }
          }
        } else {
          setValidateStatus(res.message || 'Verifying...')
          setVerifiedImage(null)
        }
      } catch {
        setValidateStatus('Verifying...')
      }
    },
    [captureFace, validateMutation, loginMutation, login]
  )

  const startCamera = async () => {
    setError('')
    setValidateStatus('')
    setVerifiedImage(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play().catch(() => {})
      }
      setPreview(null)
      setHasStream(true)
      setFaceRect(null)
      faceTrackIntervalRef.current = setInterval(runFaceTrack, 400)
      if (tab === 'register') {
        setValidateStatus('Position your face in frame')
        setTimeout(() => runValidation(false), 500)
        validateIntervalRef.current = setInterval(() => runValidation(false), 2000)
      } else if (tab === 'login') {
        setValidateStatus('Position your face in frame')
        setTimeout(() => runValidation(true), 500)
        validateIntervalRef.current = setInterval(() => runValidation(true), 2000)
      }
    } catch {
      setError('Camera access denied. Face is required.')
    }
  }

  const stopCamera = useCallback(() => {
    if (validateIntervalRef.current) {
      clearInterval(validateIntervalRef.current)
      validateIntervalRef.current = null
    }
    if (faceTrackIntervalRef.current) {
      clearInterval(faceTrackIntervalRef.current)
      faceTrackIntervalRef.current = null
    }
    setFaceRect(null)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setPreview(null)
    setHasStream(false)
    setValidateStatus('')
    setVerifiedImage(null)
  }, [])

  const handleRegisterComplete = async () => {
    const imageToStore = verifiedImage
    if (!imageToStore) return
    isStoringFaceRef.current = true
    setError('')
    try {
      const faceResult = await registerFaceMutation.mutateAsync(imageToStore)
      if (!faceResult?.user_id) throw new Error('Invalid response')
      const result = await registerCompleteMutation.mutateAsync({
        userId: faceResult.user_id,
        name: name.trim() || undefined,
      })
      login(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      isStoringFaceRef.current = false
    }
  }

  const handleTabChange = (newTab: Tab) => {
    stopCamera()
    setTab(newTab)
    setError('')
    setValidateStatus('')
    setVerifiedImage(null)
    setPreview(null)
    setName('')
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  const isLoginPending = loginMutation.isPending
  const isRegisterFacePending = registerFaceMutation.isPending
  const isRegisterCompletePending = registerCompleteMutation.isPending
  const hasFeed = hasStream || preview

  const isRegisterVerified = tab === 'register' && validateStatus === 'verified' && hasFeed

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-logo">J.A.R.V.I.S.</h1>
        <p className="auth-subtitle">Face authentication required</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={tab === 'login' ? 'active' : ''}
            onClick={() => handleTabChange('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={tab === 'register' ? 'active' : ''}
            onClick={() => handleTabChange('register')}
          >
            Register
          </button>
        </div>

        <>
            <div className="auth-face-area">
              {preview ? (
                <img src={preview} alt="Face" className="auth-preview" />
              ) : (
                <div className="auth-video-zoom" style={{ ['--zoom' as string]: zoom }}>
                  <video ref={videoRef} autoPlay playsInline muted className="auth-video" />
                </div>
              )}
              {!hasFeed && (
                <div className="auth-placeholder">
                  <span>Face required</span>
                  <span className="auth-placeholder-hint">Start camera to continue</span>
                </div>
              )}
              {hasStream && (tab === 'login' || tab === 'register') && (
                <>
                  {validateStatus === 'verified' ? (
                    <div className="auth-face-guide auth-face-guide--verified">
                      <div
                        className="auth-face-outline auth-face-outline--success auth-face-outline--tracking"
                        style={faceRect ? { left: `${faceRect.left - faceRect.width * 0.08}%`, top: `${faceRect.top - faceRect.height * 0.08}%`, width: `${faceRect.width * 1.2}%`, height: `${faceRect.height * 1.2}%`, aspectRatio: 'auto' } : {}}
                      />
                      <div
                        className="auth-face-dot auth-face-dot--success"
                        style={faceRect ? { left: `${faceRect.left + faceRect.width / 2}%`, top: `${faceRect.top + faceRect.height / 2}%`, transform: 'translate(-50%, -50%)' } : {}}
                      >
                        <span>✓</span>
                      </div>
                    </div>
                  ) : (
                    <div className="auth-face-guide">
                      <div
                        className={`auth-face-outline auth-face-outline--scanning ${faceRect ? 'auth-face-outline--tracking' : ''}`}
                        style={faceRect ? { left: `${faceRect.left - faceRect.width * 0.1}%`, top: `${faceRect.top - faceRect.height * 0.1}%`, width: `${faceRect.width * 1.2}%`, height: `${faceRect.height * 1.2}%`, aspectRatio: 'auto' } : {}}
                      />
                      <div
                        className={`auth-face-dot auth-face-dot--pulse ${faceRect ? 'auth-face-dot--tracking' : ''}`}
                        style={faceRect ? { left: `${faceRect.left + faceRect.width / 2}%`, top: `${faceRect.top + faceRect.height / 2}%`, transform: 'translate(-50%, -50%)' } : {}}
                      />
                      {!faceRect && <div className="auth-scan-line" />}
                    </div>
                  )}
                </>
              )}
              {(tab === 'login' || tab === 'register') && hasStream && validateStatus && (
                <div
                  className={`auth-validate-overlay ${
                    validateStatus === 'verified' || validateStatus.startsWith('Recognized')
                      ? 'verified'
                      : ''
                  }`}
                >
                  {validateStatus === 'verified' ? (
                    <>Face verified ✓</>
                  ) : validateStatus.startsWith('Recognized') ? (
                    <span className="auth-btn-with-spinner">
                      <span className="auth-spinner" /> {validateStatus}
                    </span>
                  ) : (
                    <span>{validateStatus}</span>
                  )}
                </div>
              )}
            </div>

            {hasFeed && (
              <div className="auth-zoom-control">
                <span>Zoom:</span>
                {[1, 1.4, 1.8].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZoom(z)}
                    className={`auth-zoom-btn ${zoom === z ? 'active' : ''}`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
            )}
            <div className="auth-actions">
              {!hasFeed ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="auth-btn auth-btn-primary"
                >
                  {tab === 'login' ? 'Start Camera to Login' : 'Start Camera'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="auth-btn auth-btn-secondary"
                  >
                    Stop Camera
                  </button>
                  {tab === 'login' && (
                    <span className="auth-status-hint">
                      Position your face — login happens automatically
                    </span>
                  )}
                </>
              )}
              {hasFeed && tab === 'register' && validateStatus.startsWith('Already registered') && (
                <button
                  type="button"
                  onClick={() => handleTabChange('login')}
                  className="auth-btn auth-btn-primary"
                >
                  Switch to Login
                </button>
              )}
            </div>

            {isRegisterVerified && (
              <div className="auth-register-inline">
                <div className="auth-name-field">
                  <label htmlFor="auth-name-input">Your name (optional)</label>
                  <input
                    id="auth-name-input"
                    type="text"
                    placeholder="Enter name or leave blank"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="auth-input"
                    autoComplete="off"
                    aria-label="Your name"
                  />
                  <span className="auth-name-hint">Keep your face in frame — complete to finish</span>
                </div>
                <button
                  type="button"
                  onClick={handleRegisterComplete}
                  disabled={isRegisterCompletePending || isRegisterFacePending}
                  className="auth-btn auth-btn-submit"
                >
                  {isRegisterCompletePending || isRegisterFacePending ? (
                    <span className="auth-btn-with-spinner">
                      <span className="auth-spinner" /> Completing...
                    </span>
                  ) : (
                    'Complete Registration'
                  )}
                </button>
              </div>
            )}
          </>

        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  )
}
