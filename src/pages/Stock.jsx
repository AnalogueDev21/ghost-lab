import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Stock() {
  const { staff } = useAuth()
  const [items, setItems] = useState([])
  const [branches, setBranches] = useState([])
  const [branchFilter, setBranchFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState(null) // stock item being adjusted
  const [showAdd, setShowAdd] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    supabase.from('branches').select('*').then(({ data }) => setBranches(data || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    supabase.from('stock_items').select('*, branches:branch_id(key,name)').order('category').order('name')
      .then(({ data, error }) => {
        if (error) console.error(error)
        setItems(data || [])
        setLoading(false)
      })
  }, [refreshKey])

  const filtered = branchFilter === 'all' ? items : items.filter(i => i.branches?.key === branchFilter)
  const grouped = filtered.reduce((acc, i) => {
    (acc[i.category] = acc[i.category] || []).push(i)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>สต๊อก & เบิกจ่าย</div>
          <div style={{ fontSize: 12, color: 'var(--ghost-gray)' }}>จัดการสต็อกวัตถุดิบและสินค้า</div>
        </div>
        <div onClick={() => setShowAdd(true)} className="btn btn-primary">+ เพิ่มวัตถุดิบ</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {[['all', 'ทุกสาขา'], ...branches.map(b => [b.key, b.name])].map(([key, label]) => (
          <div key={key} onClick={() => setBranchFilter(key)} className="btn" style={{
            fontSize: 12,
            borderColor: branchFilter === key ? 'var(--blood)' : 'var(--line)',
            color: branchFilter === key ? 'var(--bone)' : 'var(--ghost-gray)',
            background: branchFilter === key ? 'rgba(196,30,42,0.14)' : 'rgba(255,255,255,0.02)',
          }}>
            {label}
          </div>
        ))}
      </div>

      {loading ? <div style={{ color: 'var(--ghost-gray)', fontSize: 12 }}>กำลังโหลด...</div> : (
        Object.keys(grouped).length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ghost-gray)', fontSize: 12 }}>
            ยังไม่มีวัตถุดิบ — กด "+ เพิ่มวัตถุดิบ" เพื่อเริ่มเพิ่ม
          </div>
        ) : Object.entries(grouped).map(([category, catItems]) => (
          <div key={category} className="panel" style={{ marginBottom: 16 }}>
            <div className="font-display" style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{category}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: 10, padding: '0 0 8px', fontSize: 10, color: 'var(--ghost-gray)', textTransform: 'uppercase', letterSpacing: 1 }}>
              <div>รายการ</div><div>สาขา</div><div>คงเหลือ</div><div>หน่วย</div><div></div>
            </div>
            {catItems.map(item => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: 10, padding: '8px 0', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ghost-gray)' }}>{item.branches?.name || '—'}</div>
                <div className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: item.quantity > 0 ? '#3FB950' : 'var(--blood)' }}>{item.quantity}</div>
                <div style={{ fontSize: 12, color: 'var(--ghost-gray)' }}>{item.unit || 'ชิ้น'}</div>
                <div onClick={() => setAdjusting(item)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>±</div>
              </div>
            ))}
          </div>
        ))
      )}

      {adjusting && (
        <AdjustModal
          item={adjusting} staff={staff}
          onClose={() => setAdjusting(null)}
          onSaved={() => { setAdjusting(null); setRefreshKey(k => k + 1) }}
        />
      )}
      {showAdd && (
        <AddStockModal
          branches={branches}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); setRefreshKey(k => k + 1) }}
        />
      )}
    </div>
  )
}

function AdjustModal({ item, staff, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const change = parseInt(amount)
    if (!change) return
    setSaving(true)
    const newQty = item.quantity + change
    const { error: updateErr } = await supabase.from('stock_items')
      .update({ quantity: newQty, updated_by: staff?.id, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (updateErr) { console.error(updateErr); setSaving(false); return }
    const { error: moveErr } = await supabase.from('stock_movements').insert({
      stock_item_id: item.id, staff_id: staff?.id, change, reason: reason || null,
    })
    if (moveErr) console.error(moveErr)
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="panel" style={{ width: '100%', maxWidth: 380, background: 'var(--static)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="font-display" style={{ fontSize: 15, fontWeight: 600 }}>ปรับสต็อก · {item.name}</div>
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--ghost-gray)', fontSize: 18 }}>✕</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ghost-gray)', marginBottom: 10 }}>คงเหลือปัจจุบัน: {item.quantity} {item.unit}</div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>จำนวนที่ปรับ (+ รับเข้า / - เบิกออก)</label>
          <input className="input" type="number" placeholder="เช่น 10 หรือ -5" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>หมายเหตุ (optional)</label>
          <input className="input" value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <div onClick={onClose} className="btn btn-secondary">ยกเลิก</div>
          <div onClick={save} className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</div>
        </div>
      </div>
    </div>
  )
}

function AddStockModal({ branches, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('วัตถุดิบ')
  const [unit, setUnit] = useState('ชิ้น')
  const [quantity, setQuantity] = useState('0')
  const [branchId, setBranchId] = useState(branches[0]?.id || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim() || !branchId) return
    setSaving(true)
    const { error } = await supabase.from('stock_items').insert({
      branch_id: branchId, category, name: name.trim(), unit, quantity: parseInt(quantity) || 0,
    })
    setSaving(false)
    if (error) { console.error(error); return }
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="panel" style={{ width: '100%', maxWidth: 420, background: 'var(--static)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>เพิ่มวัตถุดิบ</div>
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--ghost-gray)', fontSize: 18 }}>✕</div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>ชื่อ</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>หมวดหมู่</label>
            <input className="input" value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>หน่วย</label>
            <input className="input" value={unit} onChange={e => setUnit(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>จำนวนเริ่มต้น</label>
            <input className="input" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--ghost-gray)', display: 'block', marginBottom: 6 }}>สาขา</label>
            <select className="input" value={branchId} onChange={e => setBranchId(e.target.value)}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <div onClick={onClose} className="btn btn-secondary">ยกเลิก</div>
          <div onClick={save} className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'กำลังเพิ่ม...' : 'เพิ่ม'}</div>
        </div>
      </div>
    </div>
  )
}
