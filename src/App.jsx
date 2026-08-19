import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import GaragePOS from './pages/GaragePOS'
import ChillPOS from './pages/ChillPOS'
import Attendance from './pages/Attendance'
import Members from './pages/Members'
import Stock from './pages/Stock'
import Expenses from './pages/Expenses'
import Profile from './pages/Profile'
import AdminStaff from './pages/AdminStaff'
import { ROLES } from './lib/roles'
import { isSupabaseConfigured } from './lib/supabase'
import ConfigurationError from './components/ConfigurationError'

export default function App() {
  if (!isSupabaseConfigured) return <ConfigurationError />

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout title="หน้าหลัก" sub="Home Overview"><Home /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/garage" element={
            <ProtectedRoute allow={[ROLES.OWNER, ROLES.HEAD_MECHANIC, ROLES.MECHANIC, ROLES.MECHANIC_TRAINEE]}>
              <Layout title="Ghost Lab Garage" sub="Garage Operations"><GaragePOS /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/chill" element={
            <ProtectedRoute allow={[ROLES.OWNER, ROLES.CHILL_MANAGER, ROLES.CHILL_STAFF]}>
              <Layout title="Ghost Chill" sub="Food & Drink Operations"><ChillPOS /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/members" element={
            <ProtectedRoute allow={[ROLES.OWNER, ROLES.HEAD_MECHANIC, ROLES.CHILL_MANAGER]}>
              <Layout title="Members & Coupons" sub="Loyalty Program">
                <Members />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/attendance" element={
            <ProtectedRoute>
              <Layout title="ลงเวลา · Attendance" sub="Clock In / Clock Out"><Attendance /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/stock" element={
            <ProtectedRoute allow={[ROLES.OWNER, ROLES.STOCK_KEEPER]}>
              <Layout title="สต๊อก & เบิกจ่าย" sub="Stock & Prepay Management">
                <Stock />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/expenses" element={
            <ProtectedRoute>
              <Layout title="ค่าใช้จ่าย" sub="Expense Tracker">
                <Expenses />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout title="โปรไฟล์ของฉัน" sub="My Profile">
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/staff" element={
            <ProtectedRoute allow={[ROLES.OWNER]}>
              <Layout title="จัดการพนักงาน" sub="Staff Admin">
                <AdminStaff />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
