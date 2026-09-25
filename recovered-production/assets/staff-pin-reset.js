const SUPABASE_URL = '__SUPABASE_URL__'
const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__'
const ADMIN_PATH = '/admin/staff'

export function canManagePinResets(staff) {
  return Boolean(staff?.active && ['owner', 'god'].includes(staff.role))
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

async function api(path, session, options = {}) {
  const response = await fetch(new URL(`/rest/v1/${path}`, SUPABASE_URL), {
    method: options.method || 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.message || payload.hint || `HTTP ${response.status}`)
  }
  return response
}

async function loadCurrentStaff(session) {
  const params = new URLSearchParams({
    select: 'id,role,active',
    auth_user_id: `eq.${session.user.id}`,
    limit: '1',
  })
  const response = await api(`staff?${params}`, session)
  return (await response.json())[0] || null
}

async function loadStaffDirectory(session) {
  const params = new URLSearchParams({
    select: 'id,name_en,name_th,role,active',
    order: 'active.desc,name_en.asc',
  })
  const response = await api(`staff?${params}`, session)
  return response.json()
}

function ensureStyles() {
  if (document.getElementById('staff-pin-reset-styles')) return
  const style = document.createElement('style')
  style.id = 'staff-pin-reset-styles'
  style.textContent = `
    .staff-pin-reset { margin-bottom: 16px; padding: 16px 18px; }
    .staff-pin-reset__head { align-items: center; display: flex; gap: 12px; justify-content: space-between; margin-bottom: 12px; }
    .staff-pin-reset__head h2 { font-size: 15px; margin: 0; }
    .staff-pin-reset__head p { color: var(--ghost-gray); font-size: 11px; margin: 3px 0 0; }
    .staff-pin-reset__form { align-items: end; display: grid; gap: 10px; grid-template-columns: minmax(180px, 1fr) 150px 150px auto; }
    .staff-pin-reset label { color: var(--ghost-gray); display: grid; font-size: 10px; gap: 5px; }
    .staff-pin-reset .input { min-width: 0; width: 100%; }
    .staff-pin-reset__message { font-size: 11px; margin-top: 10px; min-height: 17px; }
    .staff-pin-reset__message.is-error { color: #f18b92; }
    .staff-pin-reset__message.is-success { color: #53d37a; }
    @media (max-width: 900px) { .staff-pin-reset__form { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px) { .staff-pin-reset__form { grid-template-columns: 1fr; } }
  `
  document.head.appendChild(style)
}

function createPanel() {
  const panel = document.createElement('section')
  panel.id = 'staff-pin-reset'
  panel.className = 'panel staff-pin-reset'
  panel.innerHTML = `
    <div class="staff-pin-reset__head">
      <div><h2>รีเซ็ต PIN พนักงาน</h2><p>Owner/GOD ตั้ง PIN ใหม่ 4 หลักได้ โดยไม่ต้องลบบัญชีหรือประวัติบิล</p></div>
    </div>
    <form class="staff-pin-reset__form">
      <label>บัญชีพนักงาน<select class="input" name="staff" required><option value="">กำลังโหลด...</option></select></label>
      <label>PIN ใหม่<input class="input" name="pin" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="new-password" placeholder="••••" required></label>
      <label>ยืนยัน PIN<input class="input" name="confirm" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="new-password" placeholder="••••" required></label>
      <button class="btn btn-primary" type="submit">รีเซ็ต PIN</button>
    </form>
    <div class="staff-pin-reset__message" role="status" aria-live="polite"></div>
  `
  return panel
}

function setMessage(panel, text, type = '') {
  const message = panel.querySelector('.staff-pin-reset__message')
  message.textContent = text
  message.className = `staff-pin-reset__message${type ? ` is-${type}` : ''}`
}

async function mount() {
  if (location.pathname !== ADMIN_PATH || document.getElementById('staff-pin-reset')) return
  const host = document.querySelector('.page-enter')
  if (!host) return

  const session = readSession()
  if (!session?.access_token || !session?.user?.id) return

  try {
    const currentStaff = await loadCurrentStaff(session)
    if (!canManagePinResets(currentStaff)) return

    ensureStyles()
    const panel = createPanel()
    host.prepend(panel)

    const directory = await loadStaffDirectory(session)
    const select = panel.querySelector('select[name="staff"]')
    select.innerHTML = '<option value="">— เลือกบัญชี —</option>'
    for (const staff of directory) {
      const option = document.createElement('option')
      option.value = staff.id
      option.textContent = `${staff.name_en}${staff.name_th ? ` · ${staff.name_th}` : ''} · ${staff.role}${staff.active ? '' : ' (ปิดใช้งาน)'}`
      select.appendChild(option)
    }

    panel.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault()
      const form = event.currentTarget
      const targetStaffId = form.elements.staff.value
      const pin = form.elements.pin.value
      const confirmation = form.elements.confirm.value
      const button = form.querySelector('button[type="submit"]')

      if (!targetStaffId) return setMessage(panel, 'กรุณาเลือกบัญชีพนักงาน', 'error')
      if (!/^\d{4}$/.test(pin)) return setMessage(panel, 'PIN ต้องเป็นตัวเลข 4 หลัก', 'error')
      if (pin !== confirmation) return setMessage(panel, 'PIN ยืนยันไม่ตรงกัน', 'error')
      if (!window.confirm('ยืนยันการเปลี่ยน PIN ของบัญชีนี้?')) return

      button.disabled = true
      button.textContent = 'กำลังรีเซ็ต...'
      setMessage(panel, '')
      try {
        await api('rpc/reset_staff_pin', session, {
          method: 'POST',
          body: { target_staff_id: targetStaffId, new_pin: pin },
        })
        form.elements.pin.value = ''
        form.elements.confirm.value = ''
        setMessage(panel, 'รีเซ็ต PIN สำเร็จ สามารถใช้ PIN ใหม่เข้าสู่ระบบได้ทันที', 'success')
      } catch (error) {
        setMessage(panel, `รีเซ็ตไม่สำเร็จ: ${error.message}`, 'error')
      } finally {
        button.disabled = false
        button.textContent = 'รีเซ็ต PIN'
      }
    })
  } catch (error) {
    console.warn('[Ghost Lab] Unable to load PIN reset controls:', error)
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const start = () => {
    mount()
    new MutationObserver(mount).observe(document.body, { childList: true, subtree: true })
    window.addEventListener('popstate', mount)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
}
