import fs from 'node:fs'
import Papa from 'papaparse'

const DOCS = '/Users/seungchuloh/Documents'

function decode(path) {
  const buf = fs.readFileSync(path)
  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    text = new TextDecoder('euc-kr').decode(buf)
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return text
}

// mirror parser helpers
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const isNumeric = (v) => /[0-9]/.test(String(v ?? ''))
const pushLine = (arr, v) => {
  const t = String(v ?? '').trim()
  if (t) arr.push(t)
}
function parseAmount(raw, div) {
  let s = String(raw ?? '').replace(/[,\s]/g, '')
  if (!s || !/[0-9]/.test(s)) return null
  s = s.replace(/[△▲]/g, '-')
  const n = parseFloat(s)
  if (isNaN(n)) return null
  return Math.round(div ? n / 1000 : n)
}
function isGyeongsangDeptHeader(c0) {
  const hasSpace = /\s/.test(c0)
  if (!hasSpace && /(과|담당관)$/.test(c0)) return '과'
  if (!hasSpace && /(국|실|본부|처|위원회|청|관|원|센터|사업소|단)$/.test(c0)) return '상위'
  return null
}
function gyeongsangNameFromCell(c1raw) {
  return String(c1raw ?? '').split('\n')[0].replace(/\s+/g, ' ').trim()
}
function sameBudgetRow(reqA, adjA, reqB, adjB) {
  const norm = (v) => String(v ?? '').replace(/\s/g, '')
  return norm(reqA) === norm(reqB) && norm(adjA) === norm(adjB)
}
function buildGyeongsangName(program, name) {
  const n = name.trim()
  const p = program.trim()
  if (!n) return p
  if (!p || n === p || n.includes(p)) return n
  if (/^[(\（·★-]/.test(n)) return p
  const compact = n.replace(/\s/g, '')
  const isShort = compact.length <= 12
  const isRankLike = /^[\d~０-９]+급$/.test(compact) || /^(시장|위원장|사무국장)$/.test(n)
  if (p === '기본경비' || p === '기관운영' || isShort || isRankLike) return `${p}(${n})`
  return n
}

function parseGyeongsang(rows) {
  const records = []
  let 상위부서 = '', 하위부서 = '', program = ''
  let pendingC0 = null
  const state = { cur: null }

  const flushPendingC0 = () => {
    if (!pendingC0) return
    records.push({ 사업명: pendingC0.name, 요구액: pendingC0.요구액, 부서명: 하위부서 || 상위부서 })
    pendingC0 = null
  }
  const flush = () => {
    if (!state.cur) return
    records.push({ 사업명: state.cur.사업명, 요구액: state.cur.요구액, 부서명: state.cur.부서명 })
    state.cur = null
  }
  const beginProject = (name, req, adj) => {
    flush()
    state.cur = { 사업명: name, 요구액: parseAmount(req, true), 부서명: 하위부서 || 상위부서 }
  }

  for (let i = 5; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length < 10) continue
    const c0 = clean(r[0])
    const c1raw = String(r[1] ?? '').trim()
    const c1 = clean(r[1])
    const req = String(r[5] ?? ''), adj = String(r[6] ?? '')
    const rowHasBudget = isNumeric(req) || isNumeric(adj) || isNumeric(r[3])
    if (c0 === '합계') continue

    if (c0) {
      flush()
      flushPendingC0()
      if (rowHasBudget) {
        const deptType = isGyeongsangDeptHeader(c0)
        if (deptType) {
          if (deptType === '과') 하위부서 = c0
          else { 상위부서 = c0; 하위부서 = '' }
        } else {
          program = c0
          pendingC0 = { name: c0, req, adj, 요구액: parseAmount(req, true), 조정액: parseAmount(adj, true) }
        }
      } else {
        const deptType = isGyeongsangDeptHeader(c0)
        if (deptType === '과') 하위부서 = c0
        else if (deptType === '상위') { 상위부서 = c0; 하위부서 = '' }
        else program = c0
      }
    } else if (c1 && rowHasBudget) {
      let name = gyeongsangNameFromCell(c1raw)
      if (pendingC0 && sameBudgetRow(pendingC0.req, pendingC0.adj, req, adj)) {
        name = pendingC0.name
        pendingC0 = null
      } else {
        pendingC0 = null
        name = buildGyeongsangName(program, name)
      }
      beginProject(name, req, adj)
    }
  }
  flush()
  flushPendingC0()
  return records
}

const f = fs.readdirSync(DOCS).find((x) => x.normalize('NFC').includes('경상') && x.includes('25'))
const rows = Papa.parse(decode(`${DOCS}/${f}`), { header: false, skipEmptyLines: false }).data
const recs = parseGyeongsang(rows)
console.log('records:', recs.length)
const checks = ['4급', '시장', '1급', '부산이노비즈', '이중언어', '국50']
for (const kw of checks) {
  const hit = recs.filter((r) => r.사업명.includes(kw)).slice(0, 2)
  console.log(`\n[${kw}]`, hit.map((r) => r.사업명).join(' | ') || '(none)')
}
