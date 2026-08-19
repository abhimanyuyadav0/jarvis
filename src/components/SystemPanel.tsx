import { useSystemStats } from '../api'
import './SystemPanel.css'

interface StatRowProps {
  label: string
  percent: number
  detail: string
}

function StatRow({ label, percent, detail }: StatRowProps) {
  const level = percent >= 85 ? 'critical' : percent >= 65 ? 'warn' : 'ok'
  return (
    <div className="stat-row">
      <div className="stat-row-top">
        <span className="stat-label">{label}</span>
        <span className={`stat-value ${level}`}>{percent.toFixed(1)}%</span>
      </div>
      <div className="stat-bar">
        <div className={`stat-bar-fill ${level}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <span className="stat-detail">{detail}</span>
    </div>
  )
}

interface SystemPanelProps {
  enabled: boolean
}

export default function SystemPanel({ enabled }: SystemPanelProps) {
  const { data, isError } = useSystemStats(enabled)

  return (
    <div className="system-panel">
      <div className="panel-header">
        <span>SYSTEM</span>
        <div className="header-line" />
      </div>
      <div className="system-body">
        {!enabled ? (
          <div className="system-empty">Offline mode — no backend</div>
        ) : isError ? (
          <div className="system-empty">Unable to reach backend</div>
        ) : !data ? (
          <div className="system-empty">Reading telemetry...</div>
        ) : (
          <>
            <StatRow label="CPU" percent={data.cpu_percent} detail={`${data.cpu_percent.toFixed(0)}% load`} />
            <StatRow
              label="MEMORY"
              percent={data.memory.percent}
              detail={`${data.memory.used_gb.toFixed(1)} / ${data.memory.total_gb.toFixed(1)} GB`}
            />
            <StatRow
              label="STORAGE"
              percent={data.disk.percent}
              detail={`${data.disk.free_gb.toFixed(1)} GB free of ${data.disk.total_gb.toFixed(1)} GB`}
            />
          </>
        )}
      </div>
    </div>
  )
}
