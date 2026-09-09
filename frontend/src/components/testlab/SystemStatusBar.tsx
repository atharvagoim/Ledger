import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

type Health = 'checking' | 'up' | 'down'

function Dot({ health }: { health: Health }) {
  const color = health === 'up' ? 'bg-success' : health === 'down' ? 'bg-danger' : 'bg-ink-300 animate-pulse'
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
}

function label(health: Health) {
  return health === 'up' ? 'Connected' : health === 'down' ? 'Unreachable' : 'Checking…'
}

/**
 * Polls the real `/actuator/health` endpoint - not a hardcoded "everything's fine".
 * Spring Boot's health indicator already aggregates the datasource, so "backend up"
 * and "database up" are reported from the one real signal available; this is stated
 * plainly below rather than faking a second, independent database check.
 */
export function SystemStatusBar() {
  const [health, setHealth] = useState<Health>('checking')

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch(`${BASE_URL}/actuator/health`)
        if (!cancelled) setHealth(res.ok ? 'up' : 'down')
      } catch {
        if (!cancelled) setHealth('down')
      }
    }
    check()
    const interval = setInterval(check, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-card border border-surface-border bg-white px-4 py-2.5 text-xs">
      <span className="flex items-center gap-1.5 text-ink-500">
        <Activity size={13} />
        System status
      </span>
      <span className="flex items-center gap-1.5 text-ink-700">
        <Dot health={health} /> Backend &amp; database: {label(health)}
      </span>
      <span className="flex items-center gap-1.5 text-ink-700">
        <Dot health={health} /> API: {health === 'up' ? 'Healthy' : health === 'down' ? 'Unavailable' : 'Checking…'}
      </span>
      <span className="ml-auto rounded-full bg-ledger-tint px-2 py-0.5 font-medium text-ledger">
        Development / Demo
      </span>
    </div>
  )
}
