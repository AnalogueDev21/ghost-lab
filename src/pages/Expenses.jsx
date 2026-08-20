import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MATERIAL_OPTIONS = ['สารเคมี', 'แพงวงจร', 'Steel Alloy', 'สายไฟ', 'Aluminum', 'พลาสติก', 'Iron', 'แผ่นหนัง']

export default function Expenses() {
  const { staff } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [branches, setBranches] = useState([])
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [cashLedger, setCashLedger] = useState([])
  const isOwner = staff?.role === 'owner'
  const canMarkPaid = isOwner || staff?.role === 'accountant'

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

  useEffect(() => {
    if (!isOwner) { setCashLedger([]); return }
    supabase.from('cash_ledger').select('id, entry_type, amount, description, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        setCashLedger(data || [])
      })
  }, [isOwner, refreshKey])

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
  const centralCash = cashLedger.reduce((sum, entry) => sum + entry.amount, 0)
  const purchaseTotal = Math.abs(cashLedger.filter(entry => entry.entry_type === 'purchase').reduce((sum, entry) => sum + entry.amount, 0))
  const billIncome = cashLedger.filter(entry => entry.entry_type === 'bill_income').reduce((sum, entry) => sum + entry.amount, 0)
  const membershipIncome = cashLedger.filter(entry => entry.entry_type === 'membership_income').reduce((sum, entry) => sum + entry.amount, 0)
  const manualAdjustments = cashLedger.filter(entry => entry.entry_type === 'manual_adjustment').reduce((sum, entry) => sum + entry.amount, 0)

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
        {isOwner && <div style={{ display: 'flex', gap: 8 }}><div onClick={() => setShowAdjust(true)} className="btn btn-secondary">± ปรับยอดเงินกลาง</div><div onClick={() => setShowAdd(true)} className="btn btn-primary">+ ซื้อ/เบิกเงินกลาง</div></div>}
      </div>

      {isOwner && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
          <FinanceCard label="เงินกลางคงเหลือ" value={centralCash} accent={centralCash < 0 ? 'negative' : 'neutral'} />
          <FinanceCard label="รายรับจากบิล" value={billIncome} accent="positive" />
          <FinanceCard label="ค่าสมาชิก" value={membershipIncome} accent="positive" />
          <FinanceCard label="ซื้อ / ค่าใช้จ่าย" value={purchaseTotal} accent="negative" prefix="−" />
          <FinanceCard label="ปรับยอดโดย Owner" value={manualAdjustments} accent={manualAdjustments < 0 ? 'negative' : 'positive'} signed />
          <FinanceCard label="จำนวนรายการการเงิน" value={cashLedger.length} accent="neutral" count />
        </div>
      )}

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
      {showAdjust && <CashAdjustmentModal onClose={() => setShowAdjust(false)} onSaved={() => { setShowAdjust(false); setRefreshKey(k => k + 1) }} />}
    </div>
  )
}

function FinanceCard({ label, value, accent, prefix = '', signed = false, count = false }) {
  const color = accent === 'negative' ? 'var(--blood)' : accent === 'positive' ? '#84d6a8' : 'var(--bone)'
  const rendered = signed && value > 0 ? `+${value.toLocaleString()}` : `${prefix}${value.toLocaleString()}`
  return <div className="panel"><div style={{ fontSize: 11, color: 'var(--ghost-gray)', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div><div className="font-mono" style={{ fontSize: 22, fontWeight: 700, color }}>{count ? rendered : `¥${rendered}`}</div></div>
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
    const { error } = await supabase.rpc('record_cash_purchase', {
      p_branch_id: branchId || null,
      p_category: category,
      p_description: description.trim(),
      p_amount: parseInt(amount) || 0,
    })
    setSaving(false)
    if (error) { console.error(error); return }
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="panel" style={{ width: '100%', maxWidth: 420, background: 'var(--static)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>ซื้อ/เบิกเงินกลาง</div>
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--ghost-gray)', fontSize: 18 }}>✕</div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>รายละเอียด</label>
          <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="เลือกวัสดุด้านล่าง หรือพิมพ์รายการเอง" />
          <div style={{ color: 'var(--ghost-gray)', fontSize: 10, letterSpacing: .7, margin: '12px 0 7px', textTransform: 'uppercase' }}>วัสดุที่ใช้บ่อย</div>
          <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {MATERIAL_OPTIONS.map(material => <button type="button" key={material} onClick={() => setDescription(material)} style={{ background: description === material ? 'rgba(196,30,42,.18)' : 'rgba(255,255,255,.035)', border: `1px solid ${description === material ? 'var(--blood)' : 'var(--line)'}`, borderRadius: 6, color: description === material ? 'var(--bone)' : 'var(--ghost-gray)', cursor: 'pointer', font: '12px inherit', padding: '8px 10px', textAlign: 'left', transition: 'all .15s' }}>⌁ {material}</button>)}
          </div>
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
          <div onClick={save} className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'กำลังบันทึก...' : 'บันทึกและหักเงินกลาง'}</div>
        </div>
      </div>
    </div>
  )
}

function CashAdjustmentModal({ onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    const value = parseInt(amount, 10)
    if (!value || !description.trim()) return setError('กรอกรายละเอียดและยอดเงิน (ใช้เครื่องหมาย - เพื่อลดยอด)')
    setSaving(true); setError('')
    const { error: rpcError } = await supabase.rpc('record_cash_adjustment', { p_amount: value, p_description: description.trim() })
    setSaving(false)
    if (rpcError) return setError(rpcError.message)
    onSaved()
  }

  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}><div className="panel" style={{ width: '100%', maxWidth: 420, background: 'var(--static)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><div className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>ปรับยอดเงินกลาง</div><div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--ghost-gray)', fontSize: 18 }}>✕</div></div><p style={{ color: 'var(--ghost-gray)', fontSize: 11, margin: '0 0 12px' }}>ใส่เลขบวกเพื่อเพิ่มเงิน และเลขลบเพื่อลดเงิน ทุกครั้งจะเก็บประวัติไว้</p><div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>รายละเอียด</label><input className="input" value={description} onChange={event => setDescription(event.target.value)} placeholder="เช่น เติมเงินกลางจาก Owner" /></div><div style={{ marginBottom: 18 }}><label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>ยอดปรับ (¥)</label><input className="input" type="number" value={amount} onChange={event => setAmount(event.target.value)} placeholder="50000 หรือ -50000" /></div>{error && <p style={{ color: '#f18b92', fontSize: 12 }}>{error}</p>}<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><div onClick={onClose} className="btn btn-secondary">ยกเลิก</div><div onClick={save} className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'กำลังบันทึก...' : 'บันทึกการปรับยอด'}</div></div></div></div>
}
