import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import './Members.css'

const TIERS = ['regular', 'silver', 'gold', 'xkate_origin']
const TIER_LABELS = { regular: 'Regular', silver: 'Silver', gold: 'Gold', xkate_origin: 'Origin' }
const TIER_CLASS = { regular: 'tier--regular', silver: 'tier--silver', gold: 'tier--gold', xkate_origin: 'tier--origin' }
const formatAmount = amount => `¥${Number(amount || 0).toLocaleString()}`

function Avatar({ name }) {
  return <span className="member-avatar">{name?.slice(0, 2).toUpperCase() || 'GL'}</span>
}

export default function Members() {
  const [members, setMembers] = useState([])
  const [branches, setBranches] = useState([])
  const [branchFilter, setBranchFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingMember, setEditingMember] = useState(null)
  const [couponCounts, setCouponCounts] = useState({})
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    const [branchResult, memberResult, rewardResult] = await Promise.all([
      supabase.from('branches').select('*').order('name'),
      supabase.from('members').select('*, branches:branch_id(key,name)').order('created_at', { ascending: false }),
      supabase.from('member_rewards').select('member_id').eq('status', 'available'),
    ])

    if (branchResult.error || memberResult.error) {
      console.error(branchResult.error || memberResult.error)
      setError('โหลดข้อมูลสมาชิกไม่สำเร็จ ลองรีเฟรชอีกครั้ง')
    }
    setBranches(branchResult.data || [])
    setMembers(memberResult.data || [])
    if (!rewardResult.error) {
      const counts = {}
      rewardResult.data.forEach(reward => { counts[reward.member_id] = (counts[reward.member_id] || 0) + 1 })
      setCouponCounts(counts)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return members.filter(member => {
      const matchesBranch = branchFilter === 'all' || member.branches?.key === branchFilter
      const matchesQuery = !query
        || member.name?.toLowerCase().includes(query)
        || member.phone?.includes(query)
        || member.plate_or_note?.toLowerCase().includes(query)
      return matchesBranch && matchesQuery
    })
  }, [members, branchFilter, search])

  const stats = useMemo(() => ({
    total: members.length,
    spend: members.reduce((sum, member) => sum + Number(member.total_spent || 0), 0),
    rewards: Object.values(couponCounts).reduce((sum, count) => sum + count, 0),
    visits: members.reduce((sum, member) => sum + Number(member.repair_visits || 0), 0),
  }), [members, couponCounts])

  const filters = [
    { key: 'all', label: 'ทั้งหมด', count: members.length },
    ...branches.map(branch => ({ key: branch.key, label: branch.name, count: members.filter(member => member.branches?.key === branch.key).length })),
  ]

  async function deleteMember(member) {
    if (!window.confirm(`ลบสมาชิก “${member.name}” ?`)) return
    const { error: deleteError } = await supabase.from('members').delete().eq('id', member.id)
    if (deleteError) {
      console.error(deleteError)
      setError('ลบสมาชิกไม่สำเร็จ')
      return
    }
    setMembers(current => current.filter(item => item.id !== member.id))
  }

  return (
    <section className="members-page">
      <header className="members-hero">
        <div>
          <p className="members-kicker">LOYALTY DESK</p>
          <h1 className="font-display">Members <span>& Coupons</span></h1>
          <p className="members-subtitle">ดูแลข้อมูลลูกค้าประจำ ติดตามยอดสะสม และมอบรางวัลให้ตรงเวลา</p>
        </div>
        <button type="button" className="members-add" onClick={() => setEditingMember({})}>+ เพิ่มสมาชิก</button>
      </header>

      <div className="member-stats" aria-label="สรุปสมาชิก">
        <StatCard label="สมาชิกทั้งหมด" value={stats.total.toLocaleString()} note="ในฐานข้อมูลลูกค้า" icon="◎" />
        <StatCard label="ยอดสะสมรวม" value={formatAmount(stats.spend)} note="ยอดใช้จ่ายตลอดอายุสมาชิก" icon="¥" />
        <StatCard label="คูปองพร้อมใช้" value={stats.rewards.toLocaleString()} note="รางวัลซ่อมฟรีที่ยังไม่ใช้" icon="✦" accent />
        <StatCard label="งานสะสม" value={stats.visits.toLocaleString()} note="ครั้งซ่อมที่นับเข้าโปรแกรม" icon="↗" />
      </div>

      <div className="members-workspace">
        <div className="members-toolbar">
          <label className="member-search">
            <span>⌕</span>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาชื่อ, เบอร์โทร หรือทะเบียน" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="ล้างคำค้น">×</button>}
          </label>
          <button type="button" className="members-refresh" onClick={loadData} disabled={loading}>↻ รีเฟรช</button>
        </div>

        <div className="member-filters" role="tablist" aria-label="กรองตามสาขา">
          {filters.map(filter => (
            <button key={filter.key} type="button" role="tab" aria-selected={branchFilter === filter.key} className={branchFilter === filter.key ? 'is-active' : ''} onClick={() => setBranchFilter(filter.key)}>
              {filter.label}<span>{filter.count}</span>
            </button>
          ))}
        </div>

        {error && <div className="members-error">⚠ {error}</div>}

        <div className="members-list">
          <div className="members-list__header">
            <span>สมาชิก</span><span>สาขา</span><span>สถานะสะสม</span><span>ยอดใช้จ่าย</span><span>รางวัล</span><span aria-label="จัดการ" />
          </div>
          {loading ? <LoadingRows /> : filtered.map(member => (
            <article className="member-row" key={member.id}>
              <div className="member-identity"><Avatar name={member.name} /><div><strong>{member.name}</strong><small>{member.phone || 'ไม่ระบุเบอร์'}{member.plate_or_note && ` · ${member.plate_or_note}`}</small></div></div>
              <div className="member-branch">{member.branches?.name || 'ไม่ระบุสาขา'}</div>
              <div className="member-loyalty"><div><span className={`tier ${TIER_CLASS[member.tier] || 'tier--regular'}`}>{TIER_LABELS[member.tier] || 'Regular'}</span><b>{member.repair_visits || 0}<small> / 10 MT</small></b></div><Progress value={member.repair_visits || 0} /></div>
              <strong className="member-spend">{formatAmount(member.total_spent)}</strong>
              <div className="member-reward"><b>{couponCounts[member.id] || 0}</b><span>ซ่อมฟรี</span></div>
              <div className="member-actions"><button type="button" onClick={() => setEditingMember(member)}>แก้ไข</button><button type="button" className="member-actions__delete" onClick={() => deleteMember(member)} aria-label={`ลบ ${member.name}`}>×</button></div>
            </article>
          ))}
          {!loading && filtered.length === 0 && <EmptyState hasSearch={Boolean(search || branchFilter !== 'all')} onAdd={() => setEditingMember({})} />}
        </div>
      </div>

      {editingMember && <MemberModal member={editingMember} branches={branches} onClose={() => setEditingMember(null)} onSaved={() => { setEditingMember(null); loadData() }} />}
    </section>
  )
}

function StatCard({ label, value, note, icon, accent }) { return <div className={`member-stat ${accent ? 'member-stat--accent' : ''}`}><span className="member-stat__icon">{icon}</span><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div> }
function Progress({ value }) { return <div className="member-progress"><i style={{ width: `${Math.min((value % 10) * 10, 100)}%` }} /></div> }
function LoadingRows() { return <div className="members-loading"><i /><i /><i /><span>กำลังโหลดข้อมูลสมาชิก…</span></div> }
function EmptyState({ hasSearch, onAdd }) { return <div className="members-empty"><span>◎</span><h2>{hasSearch ? 'ไม่พบสมาชิกที่ค้นหา' : 'ยังไม่มีสมาชิกในระบบ'}</h2><p>{hasSearch ? 'ลองเปลี่ยนคำค้นหาหรือเลือกสาขาอื่น' : 'เริ่มสร้างฐานลูกค้าประจำและสะสมรางวัลให้พวกเขา'}</p>{!hasSearch && <button type="button" onClick={onAdd}>+ เพิ่มสมาชิกคนแรก</button>}</div> }

function MemberModal({ member, branches, onClose, onSaved }) {
  const isNew = !member.id
  const [name, setName] = useState(member.name || '')
  const [phone, setPhone] = useState(member.phone || '')
  const [plate, setPlate] = useState(member.plate_or_note || '')
  const [branchId, setBranchId] = useState(member.branch_id || branches[0]?.id || '')
  const [tier, setTier] = useState(member.tier || 'regular')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    if (!name.trim()) return setError('กรุณากรอกชื่อสมาชิก')
    setSaving(true); setError('')
    const payload = { name: name.trim(), phone: phone.trim() || null, plate_or_note: plate.trim() || null, branch_id: branchId || null, tier }
    const result = isNew ? await supabase.from('members').insert(payload) : await supabase.from('members').update(payload).eq('id', member.id)
    setSaving(false)
    if (result.error) return setError(result.error.message)
    onSaved()
  }

  return <div className="member-modal" role="dialog" aria-modal="true" aria-label={isNew ? 'เพิ่มสมาชิกใหม่' : 'แก้ไขสมาชิก'} onMouseDown={event => event.target === event.currentTarget && onClose()}><form className="member-modal__card" onSubmit={save}><header><div><span>{isNew ? 'NEW MEMBER' : 'MEMBER PROFILE'}</span><h2 className="font-display">{isNew ? 'เพิ่มสมาชิกใหม่' : 'แก้ไขข้อมูลสมาชิก'}</h2></div><button type="button" onClick={onClose} aria-label="ปิด">×</button></header><div className="member-modal__body"><label>ชื่อสมาชิก <em>*</em><input autoFocus className="input" value={name} onChange={event => setName(event.target.value)} placeholder="ชื่อลูกค้า" /></label><div className="member-modal__grid"><label>เบอร์โทร<input className="input" value={phone} onChange={event => setPhone(event.target.value)} placeholder="08x-xxx-xxxx" /></label><label>ทะเบียน / โน้ต<input className="input" value={plate} onChange={event => setPlate(event.target.value)} placeholder="เช่น กข 1234" /></label></div><div className="member-modal__grid"><label>สาขา<select className="input" value={branchId} onChange={event => setBranchId(event.target.value)}><option value="">ยังไม่ระบุ</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label>ระดับสมาชิก<select className="input" value={tier} onChange={event => setTier(event.target.value)}>{TIERS.map(item => <option key={item} value={item}>{TIER_LABELS[item]}</option>)}</select></label></div>{error && <p className="member-modal__error">⚠ {error}</p>}</div><footer><button type="button" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกสมาชิก'}</button></footer></form></div>
}
