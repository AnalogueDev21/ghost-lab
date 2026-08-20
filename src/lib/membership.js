export const MEMBERSHIP_PLANS = {
  regular: {
    key: 'regular',
    label: 'Regular',
    monthlyFee: 30000,
    discounts: { 50000: 5, 100000: 7 },
    description: 'ส่วนลดพื้นฐานสำหรับลูกค้าประจำ',
  },
  silver: {
    key: 'silver',
    label: 'Silver',
    monthlyFee: 80000,
    discounts: { 50000: 5, 100000: 10 },
    description: 'สิทธิประโยชน์เพิ่มสำหรับงานมูลค่าสูง',
  },
  gold: {
    key: 'gold',
    label: 'Gold',
    monthlyFee: 100000,
    discounts: { 50000: 5, 100000: 10 },
    description: 'สิทธิประโยชน์สูงสุด พร้อมส่วนลดเต็มขั้น',
  },
}

export const MEMBERSHIP_PLAN_KEYS = Object.keys(MEMBERSHIP_PLANS)

export function getMembershipPlan(tier) {
  return MEMBERSHIP_PLANS[tier] || MEMBERSHIP_PLANS.regular
}

export function isMembershipActive(member, now = new Date()) {
  if (!member?.membership_expires_at) return false
  return new Date(member.membership_expires_at).getTime() >= now.getTime()
}

export function calculateMemberDiscount(member, subtotal, now = new Date()) {
  const safeSubtotal = Number(subtotal || 0)
  const plan = getMembershipPlan(member?.tier)
  const active = isMembershipActive(member, now)
  const percentage = !active ? 0 : safeSubtotal >= 100000
    ? plan.discounts[100000]
    : safeSubtotal >= 50000 ? plan.discounts[50000] : 0
  const amount = Math.round(safeSubtotal * percentage / 100)

  return { active, plan, percentage, amount, total: safeSubtotal - amount }
}

export function formatDate(value) {
  if (!value) return 'ยังไม่เปิดใช้'
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

export function nextMonthlyExpiry(currentExpiry) {
  const now = new Date()
  const base = currentExpiry && new Date(currentExpiry) > now ? new Date(currentExpiry) : now
  const next = new Date(base)
  next.setMonth(next.getMonth() + 1)
  return next.toISOString()
}
