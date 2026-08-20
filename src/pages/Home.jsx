import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import BranchFilter from '../components/BranchFilter'

export default function Home() {
  const { staff } = useAuth()
  const [todayBills, setTodayBills] = useState([])
  const [onShiftCount, setOnShiftCount] = useState(0)
  const [branchFilter, setBranchFilter] = useState('all')

  useEffect(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    supabase
      .from('bills')
      .select('*, branches(key,name), staff:staff_id(name_en)')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .then(({ data, error }) => { if (!error) setTodayBills(data || []) })

    supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .is('clock_out', null)
      .then(({ count }) => setOnShiftCount(count || 0))
  }, [])

  const filteredBills = branchFilter === 'all'
    ? todayBills
    : todayBills.filter(b => b.branches?.key === branchFilter)

  const garageBills = todayBills.filter(b => b.branches?.key === 'garage')
  const chillBills = todayBills.filter(b => b.branches?.key === 'chill')
  const garageTotal = garageBills.reduce((a, b) => a + b.total, 0)
  const chillTotal = chillBills.reduce((a, b) => a + b.total, 0)
  const todayRevenue = todayBills.reduce((a, b) => a + b.total, 0)
  const commissionPending = filteredBills.reduce((a, b) => a + (b.commission || 0), 0)
  const teamSummary = Object.values(todayBills.reduce((summary, bill) => {
    const key = bill.staff_id || 'unknown'
    const current = summary[key] || { id: key, name: bill.staff?.name_en || 'ไม่ระบุพนักงาน', bills: 0, total: 0, commission: 0 }
    summary[key] = { ...current, bills: current.bills + 1, total: current.total + bill.total, commission: current.commission + Number(bill.commission || 0) }
    return summary
  }, {})).sort((a, b) => b.total - a.total)

  return (
    <div>
      <div className="panel" style={{
        background: 'linear-gradient(120deg, rgba(196,30,42,0.14), transparent 60%), var(--static)',
        padding: '26px 30px', marginBottom: 20, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 14
      }}>
        <div>
          <div className="font-display" style={{ fontSize: 11, letterSpacing: 2, color: 'var(--blood)', textTransform: 'uppercase', marginBottom: 8 }}>
            GHOST LAB · 夢島 · 職人の誇り
          </div>
          <div className="font-display" style={{ fontSize: 24, fontWeight: 600 }}>
            สวัสดี, {staff?.name_en} 👋
          </div>
        </div>
      </div>

      <BranchFilter value={branchFilter} onChange={setBranchFilter} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <StatCard label="ยอดวันนี้ · GARAGE" value={`¥${garageTotal.toLocaleString()}`} meta={`${garageBills.length} บิล`} dim={branchFilter === 'chill'} />
        <StatCard label="ยอดวันนี้ · GHOST CHILL" value={`¥${chillTotal.toLocaleString()}`} meta={`${chillBills.length} บิล`} dim={branchFilter === 'garage'} />
        <StatCard label="COMMISSION วันนี้" value={`¥${commissionPending.toLocaleString()}`} accent />
        <StatCard label="พนักงานเข้างาน" value={`${onShiftCount} คน`} />
      </div>

      {staff?.role === 'owner' && (
        <section style={{ marginBottom: 22 }}>
          <div className="font-display" style={{ color: 'var(--blood)', fontSize: 12, letterSpacing: 1.2, marginBottom: 10 }}>OWNER OVERVIEW · วันนี้</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14 }}>
            <StatCard label="รายได้รวมวันนี้" value={`¥${todayRevenue.toLocaleString()}`} meta={`${todayBills.length} บิลจากทุกสาขา`} accent />
            <StatCard label="รายได้ Garage" value={`¥${garageTotal.toLocaleString()}`} meta={`${garageBills.length} บิล`} />
            <StatCard label="รายได้ Ghost Chill" value={`¥${chillTotal.toLocaleString()}`} meta={`${chillBills.length} บิล`} />
          </div>
        </section>
      )}

      {staff?.role === 'owner' && (
        <section className="panel" style={{ marginBottom: 22 }}>
          <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div><div className="font-display" style={{ fontSize: 14, fontWeight: 600 }}>บิลของทีมวันนี้</div><div style={{ color: 'var(--ghost-gray)', fontSize: 11, marginTop: 3 }}>สรุปบิลที่พนักงานทุกคนเปิด แยกจากรายการล่าสุด</div></div>
            <span style={{ color: 'var(--ghost-gray)', fontSize: 11 }}>{teamSummary.length} คน</span>
          </div>
          {teamSummary.length === 0 ? <div style={{ color: 'var(--ghost-gray)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>วันนี้ยังไม่มีบิลจากทีม</div> : teamSummary.map(member => (
            <div key={member.id} style={{ alignItems: 'center', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <div><strong style={{ fontSize: 13 }}>{member.name}</strong><span style={{ color: 'var(--ghost-gray)', fontSize: 11, marginLeft: 8 }}>{member.bills} บิล</span></div>
              <div style={{ display: 'flex', gap: 20, textAlign: 'right' }}><div><div style={{ color: 'var(--ghost-gray)', fontSize: 9, letterSpacing: .7 }}>COMMISSION</div><strong className="font-mono" style={{ color: '#e5c158', fontSize: 13 }}>¥{member.commission.toLocaleString()}</strong></div><div><div style={{ color: 'var(--ghost-gray)', fontSize: 9, letterSpacing: .7 }}>BILL TOTAL</div><strong className="font-mono" style={{ color: '#84d6a8', fontSize: 14 }}>¥{member.total.toLocaleString()}</strong></div></div>
            </div>
          ))}
        </section>
      )}

      <div className="panel">
        <div className="font-display" style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>ออเดอร์ล่าสุด · Recent Orders</div>
        {filteredBills.length === 0
          ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ghost-gray)', fontSize: 12 }}>ยังไม่มีออเดอร์วันนี้</div>
          : filteredBills.slice(0, 10).map(b => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
              <div>
                <span className="font-mono" style={{ fontSize: 12, fontWeight: 600 }}>{b.bill_number}</span>
                <span style={{ fontSize: 11, marginLeft: 8, color: 'var(--ghost-gray)' }}>{b.branches?.name}</span>
              </div>
              <div className="font-mono" style={{ fontSize: 13, fontWeight: 600 }}>¥{b.total.toLocaleString()}</div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

function StatCard({ label, value, meta, accent, dim }) {
  return (
    <div className="panel" style={{ opacity: dim ? 0.4 : 1 }}>
      <div style={{ fontSize: 12, color: 'var(--ghost-gray)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: accent ? 'var(--blood)' : 'var(--bone)' }}>{value}</div>
      {meta && <div style={{ fontSize: 12, color: 'var(--ghost-gray)', marginTop: 6 }}>{meta}</div>}
    </div>
  )
}
