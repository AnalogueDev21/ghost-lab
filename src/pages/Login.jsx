import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [staffList, setStaffList] = useState([])
  const [selected, setSelected] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const { loginWithPin, session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/')
  }, [session])

  useEffect(() => {
    supabase
      .from('staff')
      .select('id, name_en, name_th, role')
      .eq('active', true)
      .then(({ data, error }) => {
        if (error) { console.error(error); return }
        setStaffList(data || [])
        if (data && data.length) setSelected(data[0])
      })
  }, [])

  function press(k) {
    setError('')
    if (k === 'clear') setPin('')
    else if (k === 'back') setPin(p => p.slice(0, -1))
    else if (pin.length < 4) {
      const next = pin + k
      setPin(next)
      if (next.length === 4) submit(next)
    }
  }

  async function submit(fullPin) {
    if (!selected) return
    const res = await loginWithPin(selected.name_en, fullPin)
    if (!res.ok) { setError(res.message); setPin('') }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 34, letterSpacing: 4, textTransform: 'uppercase' }}>
            GHOST<span style={{ color: 'var(--blood)' }}>·</span>LAB
          </div>
          <div style={{ fontSize: 11, color: 'var(--ghost-gray)', letterSpacing: 6, marginTop: 8 }}>ゴースト ラボ</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxWidth: 220, margin: '0 auto 20px' }}>
          {staffList.map(s => (
            <div
              key={s.id}
              onClick={() => setSelected(s)}
              className="panel"
              style={{
                textAlign: 'center', cursor: 'pointer',
                borderColor: selected?.id === s.id ? 'var(--blood)' : 'var(--line)',
                background: selected?.id === s.id ? 'linear-gradient(180deg, var(--ember), var(--static))' : 'var(--static)'
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%', margin: '0 auto 8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Inter, "Noto Sans Thai", sans-serif', fontWeight: 600, fontSize: 13,
                background: 'linear-gradient(135deg, var(--blood), var(--ember))'
              }}>
                {s.name_en.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{s.name_en}</div>
            </div>
          ))}
          {staffList.length === 0 && (
            <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--ghost-gray)', textAlign: 'center' }}>
              ยังไม่มีพนักงานในระบบ — เพิ่มผ่าน Supabase dashboard ก่อน
            </div>
          )}
        </div>

        <div className="panel">
          <div style={{ fontSize: 11, color: 'var(--ghost-gray)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, textAlign: 'center' }}>
            ใส่ PIN 4 หลักเพื่อเข้าใช้งาน
          </div>
          <div style={{ fontSize: 11, color: 'var(--blood)', textAlign: 'center', marginBottom: 8, minHeight: 14 }}>{error}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 20 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: '50%',
                border: '1.5px solid var(--ghost-gray)',
                background: i < pin.length ? 'var(--blood)' : 'transparent',
                borderColor: i < pin.length ? 'var(--blood)' : 'var(--ghost-gray)'
              }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {['1','2','3','4','5','6','7','8','9','clear','0','back'].map(k => (
              <div
                key={k}
                onClick={() => press(k)}
                className="input font-mono"
                style={{ textAlign: 'center', padding: '15px 0', fontSize: 17, cursor: 'pointer' }}
              >
                {k === 'clear' ? 'C' : k === 'back' ? '⌫' : k}
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--ghost-gray)' }}>
          พนักงานใหม่? <b style={{ color: 'var(--bone)' }}>ติดต่อ Admin เพื่อสร้างบัญชีให้</b>
        </div>
      </div>
    </div>
  )
}
