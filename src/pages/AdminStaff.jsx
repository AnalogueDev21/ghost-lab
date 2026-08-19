import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ROLES, ROLE_LABELS } from '../lib/roles'

const ROLE_OPTIONS = Object.values(ROLES)

export default function AdminStaff() {
  const [staffList, setStaffList] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    supabase.from('branches').select('*').then(({ data }) => setBranches(data || []))
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('staff').select('*').order('name_en')
    if (error) console.error(error)
    setStaffList(data || [])
    setLoading(false)
  }

  function updateLocal(id, field, value) {
    setStaffList(list => list.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  async function saveStaff(id) {
    const s = staffList.find(x => x.id === id)
    setSavingId(id)
    const { error } = await supabase.from('staff').update({
      role: s.role, active: s.active, primary_branch: s.primary_branch, name_th: s.name_th,
    }).eq('id', id)
    setSavingId(null)
    if (error) { console.error(error); alert('บันทึกไม่สำเร็จ: ' + error.message) }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>จัดการพนักงาน</div>
        <div style={{ fontSize: 12, color: 'var(--ghost-gray)' }}>
          ปรับยศ / เปิด-ปิดใช้งาน / ย้ายสาขา ของพนักงานที่มีอยู่ — สร้าง login ใหม่ยังต้องใช้ scripts/seed-staff.mjs
        </div>
      </div>

      <div className="panel">
        {loading ? <div style={{ color: 'var(--ghost-gray)', fontSize: 12 }}>กำลังโหลด...</div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr 1.4fr 0.8fr auto', gap: 10, padding: '0 0 10px', fontSize: 10, color: 'var(--ghost-gray)', textTransform: 'uppercase', letterSpacing: 1 }}>
              <div>ชื่อ</div><div>ยศ (Role)</div><div>สาขาหลัก</div><div>สถานะ</div><div></div>
            </div>
            {staffList.map(s => (
              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr 1.4fr 0.8fr auto', gap: 10, padding: '10px 0', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--blood), var(--ember))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600
                  }}>
                    {s.name_en?.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name_en}</div>
                </div>

                <select className="input" value={s.role} onChange={e => updateLocal(s.id, 'role', e.target.value)}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>

                <select className="input" value={s.primary_branch || ''} onChange={e => updateLocal(s.id, 'primary_branch', e.target.value)}>
                  <option value="">— ไม่ระบุ —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>

                <div
                  onClick={() => updateLocal(s.id, 'active', !s.active)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <div style={{
                    width: 34, height: 18, borderRadius: 10, background: s.active ? 'var(--blood)' : 'rgba(255,255,255,0.15)',
                    position: 'relative', flexShrink: 0, transition: 'background .15s'
                  }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', background: 'var(--bone)', position: 'absolute', top: 2,
                      left: s.active ? 18 : 2, transition: 'left .15s'
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--ghost-gray)' }}>{s.active ? 'ใช้งาน' : 'ปิด'}</span>
                </div>

                <div onClick={() => saveStaff(s.id)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 11, opacity: savingId === s.id ? 0.6 : 1 }}>
                  {savingId === s.id ? '...' : 'บันทึก'}
                </div>
              </div>
            ))}
            {staffList.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ghost-gray)', fontSize: 12 }}>
                ยังไม่มีพนักงานในระบบ — เพิ่มผ่าน scripts/seed-staff.mjs ก่อน
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
