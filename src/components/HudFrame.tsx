import { type ReactNode } from 'react'
import './HudFrame.css'

interface HudFrameProps {
  children: ReactNode
  status: string
  mode: string
  sessionLabel: string
  uptime: string
}

export default function HudFrame({ children, status, mode, sessionLabel, uptime }: HudFrameProps) {
  return (
    <div className="hud-frame">
      <span className="hud-corner tl" />
      <span className="hud-corner tr" />
      <span className="hud-corner bl" />
      <span className="hud-corner br" />

      <svg className="hud-tick-ring" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="94" className="hud-tick-circle" />
        {Array.from({ length: 48 }).map((_, i) => {
          const angle = (i / 48) * 360
          const major = i % 6 === 0
          return (
            <line
              key={i}
              x1="100"
              y1={major ? 4 : 8}
              x2="100"
              y2={major ? 12 : 14}
              className={`hud-tick ${major ? 'major' : ''}`}
              transform={`rotate(${angle} 100 100)`}
            />
          )
        })}
      </svg>

      <div className="hud-readout hud-readout-tl">
        <span className="hud-readout-label">STATUS</span>
        <span className="hud-readout-value">{status}</span>
      </div>
      <div className="hud-readout hud-readout-tr">
        <span className="hud-readout-label">MODE</span>
        <span className="hud-readout-value">{mode}</span>
      </div>
      <div className="hud-readout hud-readout-bl">
        <span className="hud-readout-label">SESSION</span>
        <span className="hud-readout-value">{sessionLabel}</span>
      </div>
      <div className="hud-readout hud-readout-br">
        <span className="hud-readout-label">UPTIME</span>
        <span className="hud-readout-value">{uptime}</span>
      </div>

      <div className="hud-center">{children}</div>
    </div>
  )
}
