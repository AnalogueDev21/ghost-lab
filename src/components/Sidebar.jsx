import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NAV_ITEMS, canSeeNavItem, ROLE_LABELS } from '../lib/roles'

export default function Sidebar() {
  const { staff, logout } = useAuth()
  if (!staff) return null

  return (
    <div style={{
      width: 230, flexShrink: 0, background: 'var(--static)',
      borderRight: '1px solid var(--line)', display: 'flex',
      flexDirection: 'column', padding: '22px 0', minHeight: '100vh'
    }}>
      <div style={{ padding: '0 18px 20px', borderBottom: '1px solid var(--line)', marginBottom: 14 }}>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 15, letterSpacing: 2 }}>
          GHOST<span style={{ color: 'var(--blood)' }}>·</span>LAB
        </div>
        <div style={{ fontSize: 11, color: 'var(--ghost-gray)', letterSpacing: 1, marginTop: 2 }}>
          ゴースト ラボ
        </div>
      </div>

      <div style={{ flex: 1, padding: '0 12px' }}>
        {NAV_ITEMS.filter(item => canSeeNavItem(item, staff)).map(item => (
          <NavLink
            key={item.key}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 6, fontSize: 13,
              color: isActive ? 'var(--bone)' : 'var(--ghost-gray)',
              textDecoration: 'none', marginBottom: 2,
              background: isActive ? 'linear-gradient(90deg, rgba(196,30,42,0.18), rgba(196,30,42,0.02))' : 'transparent',
              borderLeft: isActive ? '2px solid var(--blood)' : '2px solid transparent',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      <div style={{
        padding: '14px 18px', borderTop: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--blood), var(--ember))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Inter, "Noto Sans Thai", sans-serif', fontSize: 11, fontWeight: 600
          }}>
            {staff.name_en.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{staff.name_en}</div>
            <div style={{ fontSize: 11, color: 'var(--ghost-gray)' }}>{ROLE_LABELS[staff.role]}</div>
          </div>
        </div>
        <div
          onClick={logout}
          style={{ fontSize: 12, color: 'var(--ghost-gray)', cursor: 'pointer', textDecoration: 'underline' }}
        >
          ออก
        </div>
      </div>
    </div>
  )
}
