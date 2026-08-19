import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Expenses() {
  const { staff } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [branches, setBranches] = useState([])
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const canMarkPaid = staff && (staff.role === 'owner' || staff.role === 'accountant')

  useEffect(() => {
    supabase.from('branches').select('*').then(({ data }) => setBranches(data || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    supabase.from('expenses').select('*, branches:branch_id(key,name), staff:staff_id(name_en)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        setExpenses(data || [])
        setLoading(false)
      })
  }, [refreshKey])

  const filtered = expenses.filter(e => {
    const matchBranch = branchFilter === 'all' || e.branches?.key === branchFilter
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    return matchBranch && matchStatus
  })

  const totals = branches.reduce((acc, b) => {
    acc[b.key] = expenses.filter(e => e.branches?.key === b.key).reduce((a, e) => a + e.amount, 0)
    return acc
  }, {})
  const pendingTotal = expenses.filter(e => e.status === 'pending').reduce((a, e) => a + e.amount, 0)
  const pendingCount = expenses.filter(e => e.status === 'pending').length

  async function markPaid(id) {
    const { error } = await supabase.from('expenses').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id)
    if (error) { console.error(error); return }
    setRefreshKey(k => k + 1)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>ค่าใช้จ่าย</div>
          <div style={{ fontSize: 12, color: 'var(--ghost-gray)' }}>บันทึกและติดตามค่าใช้จ่ายทุกสาขา</div>
        </div>
        <div onClick={() => setShowAdd(true)} className="btn btn-primary">+ บันทึกค่าใช้จ่าย</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${branches.length + 1}, 1fr)`, gap: 14, marginBottom: 18 }}>
        <div className="panel">
          <div style={{ fontSize: 11, color: 'var(--ghost-gray)', textTransform: 'uppercase', marginBottom: 8 }}>ค้างชำระ</div>
          <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--blood)' }}>¥{pendingTotal.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--ghost-gray)', marginTop: 6 }}>{pendingCount} รายการ</div>
        </div>
        {branches.map(b => (
          <div key={b.id} className="panel">
            <div style={{ fontSize: 11, color: 'var(--ghost-gray)', textTransform: 'uppercase', marginBottom: 8 }}>{b.name}</div>
            <div className="font-mono" style={{ fontSize: 22, fontWeight: 700 }}>¥{(totals[b.key] || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['all', 'ทุกสาขา'], ...branches.map(b => [b.key, b.name])].map(([key, label]) => (
          <FilterBtn key={key} active={branchFilter === key} onClick={() => setBranchFilter(key)}>{label}</FilterBtn>
        ))}
        <div style={{ width: 1, background: 'var(--line)', margin: '0 4px' }} />
        <FilterBtn active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>ทั้งหมด</FilterBtn>
        <FilterBtn active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')}>ค้างชำระ</FilterBtn>
        <FilterBtn active={statusFilter === 'paid'} onClick={() => setStatusFilter('paid')}>จ่ายแล้ว</FilterBtn>
      </div>

      <div className="panel">
        <div style={{ fontSize: 12, color: 'var(--ghost-gray)', marginBottom: 12 }}>
          {filtered.length} รายการ · รวม ¥{filtered.reduce((a, e) => a + e.amount, 0).toLocaleString()}
        </div>
        {loading ? <div style={{ color: 'var(--ghost-gray)', fontSize: 12 }}>กำลังโหลด...</div>
          : filtered.length === 0 ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ghost-gray)', fontSize: 12 }}>ไม่มีรายการ</div>
          : filtered.map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderTop: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(196,30,42,0.15)', color: '#ff8a8a', marginRight: 8 }}>{e.category}</span>
                  {e.description}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ghost-gray)', marginTop: 3 }}>
                  {e.branches?.name || '—'} · {e.staff?.name_en || '—'} · {new Date(e.created_at).toLocaleDateString('th-TH')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="font-mono" style={{ fontSize: 14, fontWeight: 600 }}>¥{e.amount.toLocaleString()}</div>
                {e.status === 'paid'
                  ? <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 10, color: '#3FB950', border: '1px solid #3FB950' }}>✓ จ่ายแล้ว</span>
                  : canMarkPaid
                    ? <div onClick={() => markPaid(e.id)} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }}>มาร์คจ่ายแล้ว</div>
                    : <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 10, color: 'var(--ghost-gray)', border: '1px solid var(--line)' }}>ค้างชำระ</span>
                }
              </div>
            </div>
          ))
        }
      </div>

      {showAdd && (
        <AddExpenseModal
          branches={branches} staff={staff}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); setRefreshKey(k => k + 1) }}
        />
      )}
    </div>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <div onClick={onClick} className="btn" style={{
      fontSize: 12,
      borderColor: active ? 'var(--blood)' : 'var(--line)',
      color: active ? 'var(--bone)' : 'var(--ghost-gray)',
      background: active ? 'rgba(196,30,42,0.14)' : 'rgba(255,255,255,0.02)',
    }}>
      {children}
    </div>
  )
}

function AddExpenseModal({ branches, staff, onClose, onSaved }) {
  const [category, setCategory] = useState('วัตถุดิบ')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [branchId, setBranchId] = useState(branches[0]?.id || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!description.trim() || !amount) return
    setSaving(true)
    const { error } = await supabase.from('expenses').insert({
      branch_id: branchId, category, description: description.trim(),
      amount: parseInt(amount) || 0, staff_id: staff?.id, status: 'pending',
    })
    setSaving(false)
    if (error) { console.error(error); return }
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="panel" style={{ width: '100%', maxWidth: 420, background: 'var(--static)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>บันทึกค่าใช้จ่าย</div>
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--ghost-gray)', fontSize: 18 }}>✕</div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>รายละเอียด</label>
          <input className="input" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>หมวด</label>
            <input className="input" value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>ยอด (¥)</label>
            <input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>สาขา</label>
          <select className="input" value={branchId} onChange={e => setBranchId(e.target.value)}>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <div onClick={onClose} className="btn btn-secondary">ยกเลิก</div>
          <div onClick={save} className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</div>
        </div>
      </div>
    </div>
  )
}
