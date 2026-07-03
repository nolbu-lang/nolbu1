import fs from 'node:fs'
import Papa from 'papaparse'

const DOCS = '/Users/seungchuloh/Documents'
const DEPT_SUFFIX = /(실|국|과|처|본부|관|단|원|청|위원회|담당관|사업소|의회|센터|소)$/
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const isNumeric = (v) => /[0-9]/.test(String(v ?? ''))
const push = (a, v) => { const t = String(v ?? '').trim(); if (t) a.push(t) }

function decode(path) {
  const buf = fs.readFileSync(path)
  let text
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf) }
  catch { text = new TextDecoder('euc-kr').decode(buf) }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return text
}

function parseG(rows) {
  const out = []; let dept = '', prog = '', cur = null
  const flush = () => { if (cur) { cur.사업개요 = cur._o.join(' ').replace(/\s+/g,' ').trim(); cur.조건검색어 = cur._k.join(' ').replace(/\s+/g,' ').trim(); delete cur._o; delete cur._k; delete cur._r; out.push(cur); cur = null } }
  for (const r of rows) {
    if (!r || r.length < 10) continue
    const c0 = clean(r[0]), c1r = String(r[1]??'').trim(), c1 = clean(r[1])
    const req = clean(r[5]), adj = clean(r[6]), p24 = clean(r[3]), kw = String(r[9]??'').trim()
    const budget = isNumeric(req)||isNumeric(adj)||isNumeric(p24)
    if (c0 === '합계') continue
    if (c0) { flush(); if (DEPT_SUFFIX.test(c0)) { dept = c0; prog = '' } else prog = c0; continue }
    if (c1 && budget) { flush(); cur = { type:'경상사업', 부서명:dept, 사업명:c1, 사업개요:'', 조건검색어:'', 요구액:req, _o:[], _k:[], _r:[] }; push(cur._k, kw); continue }
    if (cur) { if (c1r && clean(c1r)!==dept) push(cur._o, c1r); push(cur._k, kw) }
  }
  flush(); return out
}
function parseT(rows) {
  const out = []; let dept = '', cur = null
  const flush = () => { if (cur) { cur.조건검색어 = cur._k.join(' ').replace(/\s+/g,' ').trim(); delete cur._k; out.push(cur); cur = null } }
  for (const r of rows) {
    if (!r || r.length < 13) continue
    const seq = clean(r[0]), c2 = String(r[2]??'').trim(), c3 = clean(r[3])
    const req = clean(r[8]), kw = String(r[12]??'').trim()
    if (!seq && c2 && c3 === '계') { flush(); dept = c2.split('\n')[0].replace(/\(.*$/,'').trim(); continue }
    if (seq && isNumeric(seq) && c2) { flush(); cur = { type:'투자사업', 부서명:dept, 사업명:c2.split('\n')[0].trim(), 사업개요:c2.replace(/\s+/g,' ').trim(), 조건검색어:'', 요구액:req, _k:[] }; push(cur._k, kw); continue }
    if (cur) push(cur._k, kw)
  }
  flush(); return out
}

const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase()

let all = []
for (const name of fs.readdirSync(DOCS).filter(f => f.endsWith('.csv'))) {
  const rows = Papa.parse(decode(`${DOCS}/${name}`), { header: false, skipEmptyLines: false }).data
  const cols = (() => { const m = new Map(); for (const r of rows) if (r && r.length>1) m.set(r.length,(m.get(r.length)||0)+1); return [...m.entries()].sort((a,b)=>b[1]-a[1])[0][0] })()
  const recs = cols === 10 ? parseG(rows) : cols === 13 ? parseT(rows) : []
  console.log(`${name}: cols=${cols}, records=${recs.length}, 조건검색어 있는 건수=${recs.filter(r=>r.조건검색어).length}`)
  all = all.concat(recs)
}

console.log('\n총', all.length, '건')
console.log('\n[조건검색어 샘플]')
all.filter(r => r.조건검색어).slice(0, 5).forEach(r => console.log(`- ${r.사업명} => 조건검색어="${r.조건검색어}"`))

console.log('\n[띄어쓰기/대소문자 무시 매칭 테스트]')
const tests = [
  { box: '부서명', field: '부서명', kw: '도시 공간계획국' },
  { box: '사업명', field: '사업명', kw: '도시재생' },
  { box: '조건검색어', field: '조건검색어', kw: '중점' },
]
for (const t of tests) {
  const hit = all.filter(r => norm(r[t.field]).includes(norm(t.kw)))
  console.log(`${t.box}="${t.kw}" (${t.field}에서) => ${hit.length}건`, hit[0] ? `| 예: ${hit[0].부서명} / ${hit[0].사업명}` : '')
}
