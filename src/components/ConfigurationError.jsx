import { supabaseConfigError } from '../lib/supabase'

export default function ConfigurationError() {
  return (
    <main className="configuration-error">
      <section className="panel configuration-error__card">
        <p className="configuration-error__eyebrow">GHOST·LAB · SETUP REQUIRED</p>
        <h1 className="font-display">ตั้งค่าการเชื่อมต่อก่อนใช้งาน</h1>
        <p>แอปไม่สามารถเชื่อมต่อ Supabase ได้ จึงยังไม่แสดงข้อมูลเพื่อป้องกันหน้าจอว่าง</p>
        <code>{supabaseConfigError}</code>
      </section>
    </main>
  )
}
