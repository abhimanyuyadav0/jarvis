import { useRef, useEffect } from 'react'
import './LogsPanel.css'

export interface LogEntry {
  id: string
  time: string
  type: 'user' | 'system' | 'assistant' | 'event'
  message: string
}

interface LogsPanelProps {
  logs: LogEntry[]
}

export default function LogsPanel({ logs }: LogsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [logs])

  return (
    <div className="logs-panel">
      <div className="panel-header">
        <span>SYSTEM LOGS</span>
        <div className="header-line" />
      </div>
      <div className="logs-list" ref={scrollRef}>
        {logs.length === 0 ? (
          <div className="logs-empty">No logs yet</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`log-entry ${log.type}`}>
              <span className="log-time">[{log.time}]</span>
              <span className="log-badge">{log.type}</span>
              <span className="log-msg">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
