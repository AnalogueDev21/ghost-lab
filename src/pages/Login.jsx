import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './Login.css'

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
    <div className="login-page">
      <div className="login-shell">
        <div className="login-brand">
          <div className="font-display login-brand__name">
            GHOST<span className="login-brand__dot">·</span>LAB
          </div>
          <div className="login-brand__subtitle">ゴースト ラボ</div>
        </div>

        <div className="staff-picker">
          {staffList.map(s => (
            <div
              key={s.id}
              onClick={() => setSelected(s)}
              className={`panel staff-card ${selected?.id === s.id ? 'staff-card--selected' : ''}`}
            >
              <div className="staff-card__avatar">
                {s.name_en.slice(0, 2).toUpperCase()}
              </div>
              <div className="staff-card__name">{s.name_en}</div>
            </div>
          ))}
          {staffList.length === 0 && (
            <div className="staff-picker__empty">
              ยังไม่มีพนักงานในระบบ — เพิ่มผ่าน Supabase dashboard ก่อน
            </div>
          )}
        </div>

        <div className="panel">
          <div className="pin-panel__label">
            ใส่ PIN 4 หลักเพื่อเข้าใช้งาน
          </div>
          <div className="pin-panel__error">{error}</div>
          <div className="pin-dots">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`pin-dot ${i < pin.length ? 'pin-dot--filled' : ''}`} />
            ))}
          </div>
          <div className="pin-pad">
            {['1','2','3','4','5','6','7','8','9','clear','0','back'].map(k => (
              <div
                key={k}
                onClick={() => press(k)}
                className="input font-mono pin-pad__key"
              >
                {k === 'clear' ? 'C' : k === 'back' ? '⌫' : k}
              </div>
            ))}
          </div>
        </div>
        <div className="login-footer">
          พนักงานใหม่? <strong>ติดต่อ Admin เพื่อสร้างบัญชีให้</strong>
        </div>
      </div>
    </div>
  )
}
