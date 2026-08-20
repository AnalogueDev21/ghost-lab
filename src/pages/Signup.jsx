import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toAuthPassword } from '../lib/pin'
import './Signup.css'

const DEFAULT_ROLE_BY_BRANCH = { chill: 'chill_staff', garage: 'mechanic_trainee' }

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

  useEffect(() => {
    supabase.from('branches').select('*').then(({ data, error: branchError }) => {
      if (branchError) return console.error('[Ghost Lab] Failed to load branches:', branchError)
      setBranches(data || [])
      if (data?.length) setBranchId(data[0].id)
    })
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!nameEn.trim()) return setError('กรุณากรอกชื่อ Login (EN)')
    if (!/^\d{4}$/.test(pin)) return setError('PIN ต้องเป็นตัวเลข 4 หลัก')
    if (pin !== confirmPin) return setError('PIN ไม่ตรงกัน')
    const branch = branches.find(item => item.id === branchId)
    if (!branch) return setError('กรุณาเลือกสาขา')

    setSubmitting(true)
    const email = `${nameEn.trim().toLowerCase()}@ghostlab-staff.com`
    const password = toAuthPassword(pin)
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      setError(authError.message.includes('already registered') ? 'ชื่อ Login นี้ถูกใช้แล้ว' : authError.message)
      setSubmitting(false)
      return
    }

    // Supabase can return an obfuscated user (with no identities) when the
    // email already exists. Signing in here lets a retried application finish
    // creating its staff row after an interrupted sign-up.
    let authUser = authData.user
    if (authUser?.identities?.length === 0) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError('ชื่อ Login นี้ถูกใช้แล้ว หรือ PIN ไม่ถูกต้อง')
        setSubmitting(false)
        return
      }
      authUser = signInData.user
    }

    const { error: staffError } = await supabase.from('staff').insert({
      auth_user_id: authUser.id,
      name_en: nameEn.trim(),
      name_th: nameTh.trim() || null,
      pin_hash: 'managed-by-supabase-auth',
      role: DEFAULT_ROLE_BY_BRANCH[branch.key],
      primary_branch: branch.id,
      active: true,
    })
    if (staffError) {
      setError(`สมัครไม่สำเร็จ: ${staffError.message}`)
      setSubmitting(false)
      return
    }
    setDone(true)
    setSubmitting(false)
  }

  if (done) return (
    <main className="signup-page">
      <section className="signup-card signup-success">
        <span className="signup-card__mark">G·L</span>
        <h1 className="font-display">สมัครสำเร็จ ✓</h1>
        <p>บัญชีของคุณพร้อมใช้งานแล้ว เลือกชื่อของคุณจากหน้า Login เพื่อใส่ PIN ได้เลย</p>
        <Link to="/login" className="signup-submit">← กลับหน้า Login</Link>
      </section>
    </main>
  )

  return (
    <main className="signup-page">
      <form className="signup-card" onSubmit={submit}>
        <header className="signup-header">
          <span className="signup-card__mark">G·L</span>
          <p className="signup-brand">GHOST LAB</p>
          <h1 className="font-display">สมัครสมาชิกพนักงานใหม่</h1>
          <p>กรอกข้อมูลให้ครบ แล้วเริ่มใช้งานได้ทันที</p>
        </header>
        <section className="signup-notice">
          <strong>⚠️ ชื่อ Login กับชื่อ IC ในเกมคนละอันกัน</strong>
          <p><b>ชื่อ Login (EN)</b> = ชื่อที่ใช้เข้าระบบนี้ เช่น Aoi — ตั้งชื่อเล่นหรือชื่อสั้นได้เลย</p>
          <p><b>ชื่อ (TH) / ชื่อ IC</b> = ชื่อตัวละครในเกม ใส่ไว้เพื่อให้จำง่าย ไม่บังคับ</p>
        </section>
        <div className="signup-grid">
          <label className="signup-field"><span>ชื่อ Login (EN) <em>*</em></span><input className="signup-input" placeholder="Aoi (ชื่อเล่น)" value={nameEn} onChange={event => setNameEn(event.target.value)} /><small>ใช้สำหรับ Login เท่านั้น — ไม่ใช่ชื่อ IC</small></label>
          <label className="signup-field"><span>ชื่อ (TH) / ชื่อ IC</span><input className="signup-input" placeholder="อาโออิ หรือชื่อ IC" value={nameTh} onChange={event => setNameTh(event.target.value)} /><small>ใส่ชื่อไทยหรือชื่อ IC ในเกมก็ได้</small></label>
        </div>
        <label className="signup-field signup-field--wide"><span>สาขา</span><select className="signup-input" value={branchId} onChange={event => setBranchId(event.target.value)}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <div className="signup-grid">
          <label className="signup-field"><span>PIN 4 หลัก</span><input className="signup-input" type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ''))} /></label>
          <label className="signup-field"><span>ยืนยัน PIN</span><input className="signup-input" type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={confirmPin} onChange={event => setConfirmPin(event.target.value.replace(/\D/g, ''))} /></label>
        </div>
        {error && <p className="signup-error">{error}</p>}
        <button type="submit" disabled={submitting} className="signup-submit">{submitting ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}</button>
        <Link to="/login" className="signup-back">← กลับหน้า Login</Link>
      </form>
    </main>
  )
}
