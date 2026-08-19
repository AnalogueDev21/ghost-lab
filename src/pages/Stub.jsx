// Shared placeholder for pages not built out yet (Services Catalog, Members,
// Stock, Expenses, Profile). Routing + role guard already work for these —
// only the data view/UI inside still needs to be built, page by page.
export default function Stub({ title, sub }) {
  return (
    <div className="panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div className="font-display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--ghost-gray)' }}>{sub} — กำลังจะเพิ่มในขั้นถัดไป</div>
    </div>
  )
}
