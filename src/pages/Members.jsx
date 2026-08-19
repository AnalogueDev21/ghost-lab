import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TIERS = ['regular', 'silver', 'gold', 'xkate_origin']
const TIER_LABELS = { regular: 'Regular', silver: 'Silver', gold: 'Gold', xkate_origin: 'Xkate_Origin' }

export default function Members() {
  const [members, setMembers] = useState([])
  const [branches, setBranches] = useState([])
  const [branchFilter, setBranchFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingMember, setEditingMember] = useState(null) // null = closed, {} = new, {...} = editing
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    supabase.from('branches').select('*').then(({ data }) => setBranches(data || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    supabase.from('members').select('*, branches:branch_id(key,name)').order('name')
      .then(({ data, error }) => {
        if (error) console.error(error)
        setMembers(data || [])
        setLoading(false)
      })
  }, [refreshKey])

  const filtered = members.filter(m => {
    const matchesBranch = branchFilter === 'all' || m.branches?.key === branchFilter
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || m.name?.toLowerCase().includes(q) || m.phone?.includes(q) || m.plate_or_note?.toLowerCase().includes(q)
    return matchesBranch && matchesSearch
  })

  const counts = {
    all: members.length,
    garage: members.filter(m => m.branches?.key === 'garage').length,
    chill: members.filter(m => m.branches?.key === 'chill').length,
  }

  async function deleteMember(id) {
    if (!confirm('ลบลูกค้ารายนี้?')) return
    const { error } = await supabase.from('members').delete().eq('id', id)
    if (error) { console.error(error); return }
    setMembers(m => m.filter(x => x.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>Members & Coupons</div>
          <div style={{ fontSize: 12, color: 'var(--ghost-gray)' }}>จัดการลูกค้าประจำ · ส่วนลดสมาชิก</div>
        </div>
        <div onClick={() => setEditingMember({})} className="btn btn-primary">+ เพิ่มลูกค้า</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input" placeholder="ค้นหาชื่อ / เบอร์ / ทะเบียน..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        {[['all', 'ทุกสาขา'], ['garage', 'Ghost Lab Garage'], ['chill', 'Ghost Chill']].map(([key, label]) => (
          <div
            key={key} onClick={() => setBranchFilter(key)} className="btn"
            style={{
              fontSize: 12,
              borderColor: branchFilter === key ? 'var(--blood)' : 'var(--line)',
              color: branchFilter === key ? 'var(--bone)' : 'var(--ghost-gray)',
              background: branchFilter === key ? 'rgba(196,30,42,0.14)' : 'rgba(255,255,255,0.02)',
            }}
          >
            {label} ({counts[key]})
          </div>
        ))}
      </div>

      <div className="panel">
        {loading ? <div style={{ color: 'var(--ghost-gray)', fontSize: 12 }}>กำลังโหลด...</div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 1fr 0.8fr 1fr 0.6fr auto', gap: 10, padding: '0 0 10px', fontSize: 10, color: 'var(--ghost-gray)', textTransform: 'uppercase', letterSpacing: 1 }}>
              <div>ลูกค้า</div><div>สาขา</div><div>ติดต่อ</div><div>Tier</div><div>ยอดใช้จ่าย</div><div>ครั้ง</div><div></div>
            </div>
            {filtered.map(m => (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 1fr 0.8fr 1fr 0.6fr auto', gap: 10, padding: '10px 0', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--blood), var(--ember))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600
                  }}>
                    {m.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                    {m.plate_or_note && <div style={{ fontSize: 11, color: 'var(--ghost-gray)' }}>{m.plate_or_note}</div>}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ghost-gray)' }}>{m.branches?.name || '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--ghost-gray)' }}>{m.phone || '—'}</div>
                <div>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 10, border: '1px solid var(--line)',
                    color: m.tier === 'gold' ? '#e5c158' : m.tier === 'silver' ? '#c0c0c0' : m.tier === 'xkate_origin' ? 'var(--blood)' : 'var(--ghost-gray)'
                  }}>
                    {TIER_LABELS[m.tier] || m.tier}
                  </span>
                </div>
                <div className="font-mono" style={{ fontSize: 13 }}>¥{(m.total_spent || 0).toLocaleString()}</div>
                <div className="font-mono" style={{ fontSize: 13 }}>{m.visits || 0}x</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div onClick={() => setEditingMember(m)} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 11 }}>แก้ไข</div>
                  <div onClick={() => deleteMember(m.id)} className="btn" style={{ padding: '6px 10px', fontSize: 11, color: 'var(--blood)', borderColor: 'rgba(196,30,42,0.4)' }}>ลบ</div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ghost-gray)', fontSize: 12 }}>
                ไม่พบลูกค้า
              </div>
            )}
          </>
        )}
      </div>

      {editingMember && (
        <MemberModal
          member={editingMember}
          branches={branches}
          onClose={() => setEditingMember(null)}
          onSaved={() => { setEditingMember(null); setRefreshKey(k => k + 1) }}
        />
      )}
    </div>
  )
}

function MemberModal({ member, branches, onClose, onSaved }) {
  const isNew = !member.id
  const [name, setName] = useState(member.name || '')
  const [phone, setPhone] = useState(member.phone || '')
  const [plate, setPlate] = useState(member.plate_or_note || '')
  const [branchId, setBranchId] = useState(member.branch_id || (branches[0]?.id ?? ''))
  const [tier, setTier] = useState(member.tier || 'regular')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    const payload = { name: name.trim(), phone: phone || null, plate_or_note: plate || null, branch_id: branchId, tier }
    const { error } = isNew
      ? await supabase.from('members').insert(payload)
      : await supabase.from('members').update(payload).eq('id', member.id)
    setSaving(false)
    if (error) { console.error(error); return }
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="panel" style={{ width: '100%', maxWidth: 420, background: 'var(--static)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>{isNew ? 'เพิ่มลูกค้าใหม่' : 'แก้ไขลูกค้า'}</div>
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--ghost-gray)', fontSize: 18 }}>✕</div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>ชื่อ</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>เบอร์</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>ทะเบียน / โน้ต</label>
            <input className="input" value={plate} onChange={e => setPlate(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>สาขา</label>
            <select className="input" value={branchId} onChange={e => setBranchId(e.target.value)}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>Tier</label>
            <select className="input" value={tier} onChange={e => setTier(e.target.value)}>
              {TIERS.map(t => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <div onClick={onClose} className="btn btn-secondary">ยกเลิก</div>
          <div onClick={save} className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</div>
        </div>
      </div>
    </div>
  )
}
