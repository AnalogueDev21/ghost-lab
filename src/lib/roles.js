// Single source of truth for role → menu visibility.
// Mirrors the RLS policies in supabase/schema.sql — this file only controls
// what the UI *shows*; the database still enforces what's actually allowed.

export const ROLES = {
  GOD: 'god',
  OWNER: 'owner',
  HEAD_MECHANIC: 'head_mechanic',
  MECHANIC: 'mechanic',
  MECHANIC_TRAINEE: 'mechanic_trainee',
  CHILL_MANAGER: 'chill_manager',
  CHILL_STAFF: 'chill_staff',
  STOCK_KEEPER: 'stock_keeper',
  ACCOUNTANT: 'accountant',
}

export const ROLE_LABELS = {
  [ROLES.GOD]: 'GOD · สิทธิ์สูงสุด',
  [ROLES.OWNER]: 'Owner',
  [ROLES.HEAD_MECHANIC]: 'หัวหน้าช่าง',
  [ROLES.MECHANIC]: 'ช่าง',
  [ROLES.MECHANIC_TRAINEE]: 'ช่างฝึกหัด',
  [ROLES.CHILL_MANAGER]: 'หัวหน้าร้าน',
  [ROLES.CHILL_STAFF]: 'พนักงานร้าน',
  [ROLES.STOCK_KEEPER]: 'สต๊อก',
  [ROLES.ACCOUNTANT]: 'บัญชี',
}

export const PERMISSIONS = [
  { key: 'garage_access', label: 'Ghost Lab Garage', description: 'เปิดบิลและดูงาน Garage' },
  { key: 'chill_access', label: 'Ghost Chill', description: 'เปิดบิลและดูงาน Ghost Chill' },
  { key: 'members_access', label: 'Members & Coupons', description: 'ดูข้อมูลสมาชิกและคูปอง' },
  { key: 'stock_access', label: 'สต๊อก & เบิกจ่าย', description: 'ดูและปรับยอดสต๊อก' },
  { key: 'bill_delete_own', label: 'ลบบิลของตัวเอง', description: 'ยกเลิกบิลที่ตัวเองเปิด พร้อมตัดยอดรายได้และคืนสต๊อก' },
]

// Menu items and which roles see each one.
export const NAV_ITEMS = [
  { key: 'home', label: 'หน้าหลัก', path: '/', allow: 'all' },
  { key: 'garage', permission: 'garage_access', label: 'Ghost Lab Garage', path: '/garage',
    allow: [ROLES.OWNER, ROLES.HEAD_MECHANIC, ROLES.MECHANIC, ROLES.MECHANIC_TRAINEE] },
  { key: 'chill', permission: 'chill_access', label: 'Ghost Chill', path: '/chill',
    allow: [ROLES.OWNER, ROLES.CHILL_MANAGER, ROLES.CHILL_STAFF] },
  { key: 'members', permission: 'members_access', label: 'Members & Coupons', path: '/members',
    allow: [ROLES.OWNER, ROLES.HEAD_MECHANIC, ROLES.CHILL_MANAGER] },
  { key: 'attendance', label: 'ลงเวลา Clock', path: '/attendance', allow: 'all' },
  { key: 'stock', permission: 'stock_access', label: 'สต๊อก & เบิกจ่าย', path: '/stock',
    allow: [ROLES.OWNER, ROLES.STOCK_KEEPER] },
  { key: 'expenses', label: 'ค่าใช้จ่าย', path: '/expenses', allow: 'all' },
  { key: 'profile', label: 'โปรไฟล์ของฉัน', path: '/profile', allow: 'all' },
  { key: 'admin-staff', label: 'จัดการพนักงาน', path: '/admin/staff', allow: [ROLES.OWNER] },
]

export function canSeeNavItem(item, staff) {
  return staff?.role === ROLES.GOD
    || item.allow === 'all'
    || item.allow.includes(staff.role)
    || Boolean(item.permission && staff.permissions?.includes(item.permission))
}
