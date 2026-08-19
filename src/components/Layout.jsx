import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ title, sub, children }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '30px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div className="font-display" style={{ fontSize: 22, fontWeight: 600, letterSpacing: 1 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--ghost-gray)', marginTop: 2 }}>{sub}</div>
          </div>
          <div className="font-mono" style={{ fontSize: 12, color: 'var(--ghost-gray)' }}>
            {now.toLocaleTimeString('th-TH', { hour12: false })}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
