import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../lib/roles'

// Wrap a page with this to require login, and optionally restrict to specific roles.
// Usage: <ProtectedRoute allow={['owner','stock_keeper']}><StockPage /></ProtectedRoute>
export default function ProtectedRoute({ children, allow, permission }) {
  const { session, staff, loading } = useAuth()

  if (loading) return <div style={{ padding: 40, color: '#8B8680' }}>กำลังโหลด...</div>
  if (!session || !staff) return <Navigate to="/login" replace />
  if (allow && staff.role !== ROLES.GOD && !allow.includes(staff.role) && !(permission && staff.permissions?.includes(permission))) {
    return (
      <div style={{ padding: 40, color: '#C41E2A', fontFamily: 'Inter, "Noto Sans Thai", sans-serif' }}>
        ไม่มีสิทธิ์เข้าถึงหน้านี้ · Access denied for role: {staff.role}
      </div>
    )
  }
  return children
}
