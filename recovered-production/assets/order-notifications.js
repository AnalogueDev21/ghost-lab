const SUPABASE_URL = '__SUPABASE_URL__'
const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__'
const KITCHEN_PATH = '/chill/kitchen'
const POLL_INTERVAL_MS = 10_000
const BANGKOK_TIME_ZONE = 'Asia/Bangkok'

const state = {
  count: 0,
  lastCount: 0,
  dismissedCount: 0,
  alertOpen: false,
  polling: false,
}

export function canReceiveOrderAlerts(staff) {
  if (!staff) return false
  if (staff.role === 'owner' || staff.role === 'god') return true

  const branchKey = staff.branches?.key || null
  const allowedRole = ['ceo', 'chill_manager', 'chill_staff'].includes(staff.role)
  const hasPermission = Array.isArray(staff.permissions) && staff.permissions.includes('chill_access')
  return branchKey === 'chill' && (allowedRole || hasPermission)
}

export function shouldOpenOrderAlert({ count, previousCount, dismissedCount, muted, onKitchenPage }) {
  if (count <= 0 || muted || onKitchenPage) return false
  if (previousCount === 0) return true
  return count > previousCount && count > dismissedCount
}

function bangkokDateParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
}

export function orderAlertDayKey() {
  const { year, month, day } = bangkokDateParts()
  return `${year}-${month}-${day}`
}

function todayStartIso() {
  const { year, month, day } = bangkokDateParts()
  return new Date(`${year}-${month}-${day}T00:00:00+07:00`).toISOString()
}

function mutedStorageKey() {
  return `sabinagisa-order-alert-muted:${orderAlertDayKey()}`
}

function isMutedToday() {
  return localStorage.getItem(mutedStorageKey()) === '1'
}

function projectRef() {
  try {
    return new URL(SUPABASE_URL).hostname.split('.')[0]
  } catch {
    return ''
  }
}

function readSession() {
  const ref = projectRef()
  if (!ref) return null

  const raw = localStorage.getItem(`sb-${ref}-auth-token`)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    return parsed?.currentSession || parsed?.session || parsed
  } catch {
    return null
  }
}

async function restGet(table, parameters, session, options = {}) {
  const url = new URL(`/rest/v1/${table}`, SUPABASE_URL)
  for (const [key, value] of parameters) url.searchParams.append(key, value)

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      ...(options.count ? { Prefer: 'count=exact', Range: '0-0' } : {}),
    },
  })

  if (!response.ok) throw new Error(`Order alert query failed (${response.status})`)
  return response
}

async function loadStaff(session) {
  const userId = session?.user?.id
  if (!userId) return null

  const response = await restGet('staff', [
    ['select', 'id,role,primary_branch,permissions,branches:primary_branch(key)'],
    ['auth_user_id', `eq.${userId}`],
    ['active', 'eq.true'],
    ['limit', '1'],
  ], session)
  const rows = await response.json()
  return rows[0] || null
}

async function loadChillBranchId(session) {
  const response = await restGet('branches', [
    ['select', 'id'],
    ['key', 'eq.chill'],
    ['limit', '1'],
  ], session)
  const rows = await response.json()
  return rows[0]?.id || null
}

async function loadPendingOrderCount(session, branchId) {
  const response = await restGet('bills', [
    ['select', 'id'],
    ['branch_id', `eq.${branchId}`],
    ['kitchen_status', 'not.is.null'],
    ['kitchen_status', 'neq.served'],
    ['kitchen_status', 'neq.cancelled'],
    ['created_at', `gte.${todayStartIso()}`],
  ], session, { count: true })

  const contentRange = response.headers.get('content-range') || ''
  const count = Number(contentRange.split('/').pop())
  return Number.isFinite(count) ? count : 0
}

function ensureStyles() {
  if (document.getElementById('sabinagisa-order-alert-styles')) return
  const style = document.createElement('style')
  style.id = 'sabinagisa-order-alert-styles'
  style.textContent = `
    .sabinagisa-order-badge {
      align-items: center; background: #d51f2f; border: 1px solid rgba(255,255,255,.2);
      border-radius: 999px; color: #fff; display: inline-flex; font-size: 10px;
      font-weight: 700; height: 20px; justify-content: center; margin-left: auto;
      min-width: 20px; padding: 0 6px; box-shadow: 0 0 0 2px rgba(213,31,47,.12);
    }
    .sabinagisa-order-alert {
      background: #242628; border: 1px solid rgba(213,31,47,.72); border-radius: 12px;
      bottom: 22px; box-shadow: 0 18px 55px rgba(0,0,0,.5); color: #ece7df;
      display: none; max-width: calc(100vw - 32px); padding: 18px; position: fixed;
      right: 22px; width: 360px; z-index: 10000;
    }
    .sabinagisa-order-alert.is-open { display: block; animation: sabi-order-in .2s ease-out; }
    .sabinagisa-order-alert__top { align-items: flex-start; display: flex; gap: 12px; }
    .sabinagisa-order-alert__icon {
      align-items: center; background: rgba(213,31,47,.15); border-radius: 10px;
      display: flex; flex: 0 0 42px; font-size: 21px; height: 42px; justify-content: center;
    }
    .sabinagisa-order-alert h2 { font-size: 15px; margin: 0 0 4px; }
    .sabinagisa-order-alert p { color: #b8b2aa; font-size: 12px; line-height: 1.55; margin: 0; }
    .sabinagisa-order-alert strong { color: #fff; }
    .sabinagisa-order-alert__close {
      background: transparent; border: 0; color: #aaa39b; cursor: pointer; font-size: 20px;
      line-height: 1; margin: -4px -4px 0 auto; padding: 4px;
    }
    .sabinagisa-order-alert__actions { display: flex; gap: 8px; margin-top: 15px; }
    .sabinagisa-order-alert__go, .sabinagisa-order-alert__mute {
      align-items: center; border-radius: 7px; cursor: pointer; display: inline-flex;
      font: inherit; font-size: 12px; font-weight: 600; justify-content: center;
      min-height: 38px; padding: 0 13px; text-decoration: none;
    }
    .sabinagisa-order-alert__go { background: #d51f2f; border: 1px solid #d51f2f; color: #fff; flex: 1; }
    .sabinagisa-order-alert__mute { background: transparent; border: 1px solid #4a4d50; color: #c7c1b9; }
    @keyframes sabi-order-in { from { opacity: 0; transform: translateY(10px); } }
    @media (max-width: 640px) { .sabinagisa-order-alert { bottom: 12px; left: 12px; right: 12px; width: auto; } }
  `
  document.head.appendChild(style)
}

function ensureAlert() {
  let alert = document.getElementById('sabinagisa-order-alert')
  if (alert) return alert

  alert = document.createElement('section')
  alert.id = 'sabinagisa-order-alert'
  alert.className = 'sabinagisa-order-alert'
  alert.setAttribute('role', 'alert')
  alert.setAttribute('aria-live', 'assertive')
  alert.innerHTML = `
    <div class="sabinagisa-order-alert__top">
      <div class="sabinagisa-order-alert__icon" aria-hidden="true">🍽️</div>
      <div>
        <h2>มีออเดอร์ใหม่เข้า SABINAGISA</h2>
        <p><strong data-order-count>0 ออเดอร์</strong> กำลังรอทำ<br>อย่าลืมเข้าไปจัดการออเดอร์นะคะ</p>
      </div>
      <button class="sabinagisa-order-alert__close" type="button" aria-label="ปิดแจ้งเตือน">×</button>
    </div>
    <div class="sabinagisa-order-alert__actions">
      <a class="sabinagisa-order-alert__go" href="${KITCHEN_PATH}">ไปหน้าออเดอร์เลย →</a>
      <button class="sabinagisa-order-alert__mute" type="button">ไม่แสดงอีกในวันนี้</button>
    </div>
  `

  alert.querySelector('.sabinagisa-order-alert__close').addEventListener('click', () => {
    state.alertOpen = false
    state.dismissedCount = state.count
    render()
  })
  alert.querySelector('.sabinagisa-order-alert__mute').addEventListener('click', () => {
    localStorage.setItem(mutedStorageKey(), '1')
    state.alertOpen = false
    render()
  })
  alert.querySelector('.sabinagisa-order-alert__go').addEventListener('click', () => {
    state.alertOpen = false
  })

  document.body.appendChild(alert)
  return alert
}

function renderBadges() {
  document.querySelectorAll(`a[href="${KITCHEN_PATH}"]`).forEach(link => {
    let badge = link.querySelector('.sabinagisa-order-badge')
    if (!badge) {
      badge = document.createElement('span')
      badge.className = 'sabinagisa-order-badge'
      badge.setAttribute('aria-label', 'จำนวนออเดอร์ที่รอทำ')
      link.appendChild(badge)
    }
    const label = state.count > 99 ? '99+' : String(state.count)
    if (badge.textContent !== label) badge.textContent = label
    badge.hidden = state.count === 0
  })
}

function render() {
  ensureStyles()
  renderBadges()
  const alert = ensureAlert()
  alert.querySelector('[data-order-count]').textContent = `${state.count} ออเดอร์`
  alert.classList.toggle('is-open', state.alertOpen && state.count > 0 && location.pathname !== KITCHEN_PATH)
}

function clearUi() {
  state.count = 0
  state.lastCount = 0
  state.dismissedCount = 0
  state.alertOpen = false
  render()
}

async function pollOrders() {
  if (state.polling) return
  state.polling = true
  try {
    const session = readSession()
    if (!session?.access_token) {
      clearUi()
      return
    }

    const staff = await loadStaff(session)
    if (!canReceiveOrderAlerts(staff)) {
      clearUi()
      return
    }

    const branchId = staff.branches?.key === 'chill' ? staff.primary_branch : await loadChillBranchId(session)
    if (!branchId) {
      clearUi()
      return
    }

    const nextCount = await loadPendingOrderCount(session, branchId)
    const openAlert = shouldOpenOrderAlert({
      count: nextCount,
      previousCount: state.lastCount,
      dismissedCount: state.dismissedCount,
      muted: isMutedToday(),
      onKitchenPage: location.pathname === KITCHEN_PATH,
    })

    state.count = nextCount
    state.alertOpen = state.alertOpen || openAlert
    if (nextCount === 0) {
      state.alertOpen = false
      state.dismissedCount = 0
    } else if (nextCount < state.dismissedCount) {
      state.dismissedCount = nextCount
    }
    state.lastCount = nextCount
    render()
  } catch (error) {
    console.warn('[SABINAGISA] Unable to refresh order notifications:', error)
  } finally {
    state.polling = false
  }
}

function start() {
  ensureStyles()
  const observer = new MutationObserver(renderBadges)
  observer.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('storage', event => {
    if (event.key?.includes('auth-token') || event.key?.startsWith('sabinagisa-order-alert-muted:')) pollOrders()
  })
  window.addEventListener('popstate', () => {
    if (location.pathname === KITCHEN_PATH) state.alertOpen = false
    render()
  })
  pollOrders()
  setInterval(pollOrders, POLL_INTERVAL_MS)
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
}
