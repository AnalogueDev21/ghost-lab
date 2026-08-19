// Reusable branch filter tabs, matching the "ทุกสาขา / FuwaFuwa / SpeedR" pattern.
// `value` is 'all' | 'garage' | 'chill'. Call onChange with the new value.
export default function BranchFilter({ value, onChange }) {
  const options = [
    { key: 'all', label: 'ทุกสาขา' },
    { key: 'garage', label: 'Ghost Lab Garage' },
    { key: 'chill', label: 'Ghost Chill' },
  ]
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <div
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className="btn"
          style={{
            fontSize: 12,
            borderColor: value === opt.key ? 'var(--blood)' : 'var(--line)',
            color: value === opt.key ? 'var(--bone)' : 'var(--ghost-gray)',
            background: value === opt.key ? 'rgba(196,30,42,0.14)' : 'rgba(255,255,255,0.02)',
          }}
        >
          {opt.label}
        </div>
      ))}
    </div>
  )
}
