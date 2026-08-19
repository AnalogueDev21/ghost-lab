import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toAuthPassword } from '../lib/pin'

// Self-signup for new employees. They pick a branch, set a login name + PIN,
// and the account is created immediately — but starts INACTIVE (active=false)
// and on the lowest role tier for that branch. An owner has to flip it active
// (and set the real role) from the staff table before it can be used to log in.
// This matches the "รอ Admin อนุมัติ" pattern from the Xkate reference.
export default function Signup() {
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [nameTh, setNameTh] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('branches').select('*').then(({ data, error }) => {
      if (error) { console.error('[Ghost Lab] Failed to load branches:', error); return }
      setBranches(data || [])
      if (data && data.length) setBranchId(data[0].id)
    })
  }, [])

  function defaultRoleFor(branchKey) {
    return branchKey === 'chill' ? 'chill_staff' : 'mechanic_trainee'
  }

  async function submit(e) {
    e.preventDefault()
    setError('')

    if (!nameEn.trim()) return setError('กรุณากรอกชื่อ Login (EN)')
    if (!/^\d{4}$/.test(pin)) return setError('PIN ต้องเป็นตัวเลข 4 หลัก')
    if (pin !== confirmPin) return setError('PIN ไม่ตรงกัน')
    const branch = branches.find(b => b.id === branchId)
    if (!branch) return setError('กรุณาเลือกสาขา')

    setSubmitting(true)
    const email = `${nameEn.trim().toLowerCase()}@ghostlab-staff.com`

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password: toAuthPassword(pin),
    })
    if (authError) {
      setError(authError.message.includes('already registered') ? 'ชื่อ Login นี้ถูกใช้แล้ว' : authError.message)
      setSubmitting(false)
      return
    }

    const { error: staffError } = await supabase.from('staff').insert({
      auth_user_id: authData.user.id,
      name_en: nameEn.trim(),
      name_th: nameTh.trim() || null,
      pin_hash: 'managed-by-supabase-auth',
      role: defaultRoleFor(branch.key),
      primary_branch: branch.id,
      active: false, // owner must approve before this account can be used
    })
    if (staffError) {
      setError('สมัครไม่สำเร็จ: ' + staffError.message)
      setSubmitting(false)
      return
    }

    setDone(true)
    setSubmitting(false)
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div className="panel" style={{ maxWidth: 420, textAlign: 'center', padding: 36 }}>
          <div className="font-display" style={{ fontSize: 18, marginBottom: 10 }}>สมัครสำเร็จ ✓</div>
          <div style={{ fontSize: 13, color: 'var(--ghost-gray)', marginBottom: 20 }}>
            บัญชีของคุณถูกสร้างแล้ว แต่ยังใช้งานไม่ได้จนกว่า Admin จะอนุมัติ
          </div>
          <Link to="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>← กลับหน้า Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 30, letterSpacing: 2, textTransform: 'uppercase' }}>
            GHOST<span style={{ color: 'var(--blood)' }}>·</span>LAB
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--blood)', marginTop: 14 }}>สมัครสมาชิกพนักงานใหม่</div>
          <div style={{ fontSize: 13, color: 'var(--ghost-gray)', marginTop: 4 }}>กรอกข้อมูลให้ครบ จากนั้นรอ Admin อนุมัติ</div>
        </div>

        <div className="panel" style={{
          background: 'rgba(196,30,42,0.08)', borderColor: 'rgba(196,30,42,0.3)',
          fontSize: 13, marginBottom: 20, lineHeight: 1.6
        }}>
          ⚠️ <b>ชื่อ Login กับชื่อ IC ในเกมคนละอันกัน</b><br />
          • ชื่อ Login (EN) = ชื่อที่ใช้เข้าระบบนี้ เช่น <i>Ren</i> — ตั้งชื่อเล่นหรือชื่อสั้นได้เลย<br />
          • ชื่อ (TH) / ชื่อ IC = ชื่อตัวละครในเกม ใส่ไว้ให้จำง่าย ไม่บังคับ
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>ชื่อ Login (EN) *</label>
            <input className="input" placeholder="Ren (ชื่อเล่น)" value={nameEn} onChange={e => setNameEn(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>ชื่อ (TH) / ชื่อ IC</label>
            <input className="input" placeholder="เร็น หรือชื่อ IC" value={nameTh} onChange={e => setNameTh(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>สาขา</label>
          <select className="input" value={branchId} onChange={e => setBranchId(e.target.value)}>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>PIN 4 หลัก</label>
            <input className="input" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,''))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>ยืนยัน PIN</label>
            <input className="input" type="password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g,''))} />
          </div>
        </div>

        {error && <div style={{ color: 'var(--blood)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8, border: 'none', fontSize: 14 }}>
          {submitting ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link to="/login" style={{ color: 'var(--ghost-gray)', fontSize: 13, textDecoration: 'none' }}>← กลับหน้า Login</Link>
        </div>
      </form>
    </div>
  )
}
