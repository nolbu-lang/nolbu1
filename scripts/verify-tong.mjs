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

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const isNumeric = (v) => /[0-9]/.test(String(v ?? ''))

function isGyeongsangDetailLine(c1) {
  const n = c1.trim()
  if (!n) return true
  if (/^[·•]/.test(n)) return true
  if (/^★\s*국(?:비|고)보조사업/.test(n)) return false
  if (/^국고보조사업\s*[\(（]/.test(n)) return false
  if (/^★\s*국(?:비|고)보조\s*[\(（]/.test(n)) return true
  if (/^\((?:국|시)\s*\d/.test(n)) return true
  if (/^\(행안부/.test(n)) return true
  if (/^★/.test(n)) return true
  return false
}

function resolveGyeongsangTong(tong, programTong) {
  if (tong) return { 통계목: tong, programTong: tong }
  if (programTong) return { 통계목: programTong, programTong }
  return { 통계목: '', programTong }
}

function parseAmount(raw, div) {
  let s = String(raw ?? '').replace(/[,\s]/g, '')
  if (!s || !/[0-9]/.test(s)) return null
  return Math.round(div ? parseFloat(s) / 1000 : parseFloat(s))
}

function isDept(c0) {
  const hasSpace = /\s/.test(c0)
  if (!hasSpace && /(과|담당관)$/.test(c0)) return '과'
  if (!hasSpace && /(국|실|본부|처|위원회|청|관|원|센터|사업소|단)$/.test(c0)) return '상위'
  return null
}

function sameBudgetRow(reqA, adjA, reqB, adjB) {
  const norm = (v) => String(v ?? '').replace(/\s/g, '')
  return norm(reqA) === norm(reqB) && norm(adjA) === norm(adjB)
}

function buildName(p, n) {
  n = n.trim()
  p = p.trim()
  if (!n) return p
  if (!p || n === p || n.includes(p)) return n
  if (/^[(\（·★-]/.test(n)) return p
  const compact = n.replace(/\s/g, '')
  if (p === '기본경비' || p === '기관운영' || compact.length <= 12) return `${p}(${n})`
  return n
}

function parseGyeongsang(rows) {
  const records = []
  let program = ''
  let programTong = ''
  let pendingC0 = null
  let 상위 = ''
  let 하위 = ''

  const setProgram = (name) => {
    if (program !== name) {
      program = name
      programTong = ''
    }
  }

  const flushPending = () => {
    if (!pendingC0) return
    records.push({ line: pendingC0.line, 사업명: pendingC0.name, 통계목: programTong })
    pendingC0 = null
  }

  const begin = (line, name, tong) => {
    const resolved = resolveGyeongsangTong(tong, programTong)
    programTong = resolved.programTong
    records.push({ line, 사업명: name, 통계목: resolved.통계목 })
  }

  for (let i = 5; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length < 10) continue
    const c0 = clean(r[0])
    const c1raw = String(r[1] ?? '').trim()
    const c1 = clean(r[1])
    const req = String(r[5] ?? '')
    const adj = String(r[6] ?? '')
    const tong = clean(r[8])
    const bud = isNumeric(req) || isNumeric(adj) || isNumeric(r[3])
    if (c0 === '합계') continue

    if (c0) {
      flushPending()
      if (bud) {
        const d = isDept(c0)
        if (d) {
          if (d === '과') 하위 = c0
          else {
            상위 = c0
            하위 = ''
          }
        } else {
          setProgram(c0)
          pendingC0 = { name: c0, req, adj, line: i + 1 }
        }
      } else {
        const d = isDept(c0)
        if (d === '과') 하위 = c0
        else if (d === '상위') {
          상위 = c0
          하위 = ''
        } else setProgram(c0)
      }
    } else if (c1 && bud && isGyeongsangDetailLine(c1)) {
      pendingC0 = null
    } else if (c1 && bud) {
      let name = c1raw.split('\n')[0].replace(/\s+/g, ' ').trim()
      if (pendingC0 && sameBudgetRow(pendingC0.req, pendingC0.adj, req, adj)) {
        name = pendingC0.name
        pendingC0 = null
      } else {
        pendingC0 = null
        name = buildName(program, name)
      }
      begin(i + 1, name, tong)
    }
  }
  flushPending()
  return records
}

const f = fs.readdirSync(DOCS).find((x) => x.normalize('NFC').includes('경상') && x.includes('25'))
const rows = Papa.parse(decode(`${DOCS}/${f}`), { header: false, skipEmptyLines: false }).data
const recs = parseGyeongsang(rows)

const missing = recs.filter((r) => !r.통계목)
console.log('total:', recs.length, 'missing tong:', missing.length)

const checks = [
  { line: 26535, name: '★국고보조사업' },
  { line: 4736, name: '국고보조사업' },
  { line: 25725, name: '★신규' },
  { line: 20812, name: '가족돌봄' },
  { line: 28431, name: '방과후' },
]

for (const c of checks) {
  const hit = recs.find((r) => r.line === c.line || r.사업명.includes(c.name))
  console.log(c.name, '->', hit ? `${hit.사업명} (${hit.통계목 || '없음'})` : 'not found')
}

const 보조missing = recs.filter((r) => /보조/.test(r.사업명) && !r.통계목)
console.log('\n보조 in name but no tong:', 보조missing.length)
보조missing.slice(0, 8).forEach((r) => console.log(`- L${r.line}: ${r.사업명}`))
