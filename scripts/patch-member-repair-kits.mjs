import { readFile, writeFile } from 'node:fs/promises'

async function replaceAllRequired(path, replacements) {
  let contents = await readFile(path, 'utf8')

  for (const [before, after] of replacements) {
    if (!contents.includes(before)) {
      throw new Error(`Expected text not found in ${path}: ${before.slice(0, 100)}`)
    }
    contents = contents.replace(before, after)
  }

  await writeFile(path, contents)
}

await replaceAllRequired('recovered-production/assets/POSPage-CxiIf3bD.js', [
  [
    'N=C&&E?he(C,W,n.key):{active:!1,percentage:0,amount:0,total:W},Y=!!(C&&N.active&&N.plan.unlimitedRepair),de=!!(ce&&U[0]),Z=Y||de,O=M||Z?0:N.total,pe=M?0:n.commission_flat',
    'K=C&&E?he(C,W,n.key):{active:!1,percentage:0,amount:0,total:W},F=K.active?u.reduce((t,d)=>t+(["engine repair kit","full repair kit"].includes(String(d.name||"").trim().toLowerCase())?d.price:0),0):0,Pe=Math.max(0,W-F),N=C&&E?he(C,Pe,n.key):{active:!1,percentage:0,amount:0,total:Pe},Y=F>0,de=!!(ce&&U[0]),Z=Y||de,O=M||de?0:N.total,pe=M?0:n.commission_flat',
  ],
  [
    'discount_pct:M?0:Z?100:N.percentage',
    'discount_pct:M?0:de?100:N.percentage',
  ],
  [
    'Y?e.jsx("div",{style:{color:"#e5c158",fontSize:11,fontWeight:600,marginTop:10},children:"✦ GOLD: ซ่อมฟรีไม่จำกัด ตลอดอายุสมาชิก"}):U.length>0&&e.jsxs("label",{style:{alignItems:"center",color:"#e5c158",cursor:"pointer",display:"flex",fontSize:11,gap:7,marginTop:10},children:[e.jsx("input",{type:"checkbox",checked:ce,onChange:t=>J(t.target.checked)})," ","ใช้คูปองซ่อมฟรี 1 ครั้ง (",U.length," ใบ)"]})',
    'e.jsxs("div",{children:[N.active&&e.jsx("div",{style:{color:"#e5c158",fontSize:11,fontWeight:600,marginTop:10},children:"✦ MEMBER: Engine Repair Kit และ Full Repair Kit ฟรี"}),U.length>0&&e.jsxs("label",{style:{alignItems:"center",color:"#e5c158",cursor:"pointer",display:"flex",fontSize:11,gap:7,marginTop:10},children:[e.jsx("input",{type:"checkbox",checked:ce,onChange:t=>J(t.target.checked)})," ","ใช้คูปองซ่อมฟรี 1 ครั้ง (",U.length," ใบ)"]})]})',
  ],
  [
    'Z&&e.jsxs("div",{className:"font-mono",style:{display:"flex",justifyContent:"space-between",fontSize:13,color:"#e5c158",marginBottom:6},children:[e.jsx("span",{children:Y?"GOLD FREE REPAIR":"FREE REPAIR COUPON"}),e.jsxs("span",{children:["−¥",N.total.toLocaleString()]})]})',
    'Y&&e.jsxs("div",{className:"font-mono",style:{display:"flex",justifyContent:"space-between",fontSize:13,color:"#e5c158",marginBottom:6},children:[e.jsx("span",{children:"MEMBER FREE REPAIR KITS"}),e.jsxs("span",{children:["−¥",F.toLocaleString()]})]}),de&&e.jsxs("div",{className:"font-mono",style:{display:"flex",justifyContent:"space-between",fontSize:13,color:"#e5c158",marginBottom:6},children:[e.jsx("span",{children:"FREE REPAIR COUPON"}),e.jsxs("span",{children:["−¥",N.total.toLocaleString()]})]})',
  ],
])

await replaceAllRequired('recovered-production/assets/membership-BI3ZslQk.js', [
  [
    'benefit:"ส่วนลดพื้นฐานสำหรับลูกค้าประจำ"',
    'benefit:"ส่วนลดพื้นฐาน · ฟรี Engine / Full Repair Kit"',
  ],
  [
    'benefit:"สิทธิประโยชน์เพิ่มสำหรับงานมูลค่าสูง"',
    'benefit:"สิทธิประโยชน์เพิ่ม · ฟรี Engine / Full Repair Kit"',
  ],
  [
    'benefit:"ซ่อมฟรีไม่จำกัด ตลอดอายุสมาชิก",unlimitedRepair:!0',
    'benefit:"ฟรี Engine Repair Kit และ Full Repair Kit"',
  ],
])

await replaceAllRequired('recovered-production/assets/Members-Gwy05wzy.js', [
  [
    'n=!!(r.unlimitedRepair&&b(s))',
    'n=!!(b(s)&&(((x=s.branches)==null?void 0:x.key)||"garage")==="garage")',
  ],
  [
    'title:n?"Gold Member: ซ่อมฟรีไม่จำกัดตลอดอายุสมาชิก":void 0',
    'title:n?"Member: Engine Repair Kit และ Full Repair Kit ฟรี":void 0',
  ],
  [
    'children:n?"∞":h[s.id]||0',
    'children:n?"2":h[s.id]||0',
  ],
  [
    'children:n?"ซ่อมฟรีตลอดสมาชิก":"ซ่อมฟรี"',
    'children:n?"Repair Kits ฟรี":"ซ่อมฟรี"',
  ],
])

console.log('Patched member repair-kit pricing and labels.')
