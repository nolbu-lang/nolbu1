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

function parseFundingPair(text) {
  const t = text.replace(/\s+/g, ' ')
  const 국First =
    t.match(/[(\（]\s*국(?:비)?\s*([\d,]+)\s*시(?:비)?\s*([\d,]+)/) ??
    t.match(/국(?:비)?\s*([\d,]+)\s*시(?:비)?\s*([\d,]+)/)
  if (국First) {
    return { 국: parseInt(국First[1].replace(/,/g, ''), 10), 시: parseInt(국First[2].replace(/,/g, ''), 10) }
  }
  const 시First = t.match(/[(\（]?\s*시(?:비)?\s*([\d,]+)[,，\s]+국(?:비)?\s*([\d,]+)/)
  if (시First) {
    return { 시: parseInt(시First[1].replace(/,/g, ''), 10), 국: parseInt(시First[2].replace(/,/g, ''), 10) }
  }
  return null
}

function toBaekmanPair(국, 시, totalBaekman) {
  const asIs = { 국비: 국, 시비: 시 }
  const fromCheon = { 국비: Math.round(국 / 1000), 시비: Math.round(시 / 1000) }
  if (totalBaekman == null || totalBaekman === 0) return 국 + 시 > 5000 ? fromCheon : asIs
  const diffAsIs = Math.abs(국 + 시 - totalBaekman)
  const diffCheon = Math.abs((국 + 시) / 1000 - totalBaekman)
  const tolerance = Math.max(totalBaekman * 0.2, 3)
  if (diffAsIs <= tolerance) return asIs
  if (diffCheon <= tolerance) return fromCheon
  return 국 + 시 > totalBaekman * 20 ? fromCheon : asIs
}

function extractFundingFromReview(reviewText, 요구액) {
  if (!reviewText.trim()) return null
  const lines = reviewText.split('\n')
  let reqPair = null
  let fallbackPair = null
  for (const line of lines) {
    const pair = parseFundingPair(line)
    if (!pair) continue
    if (/요구\s*내용|요구내용/.test(line)) reqPair = pair
    else if (!fallbackPair) fallbackPair = pair
  }
  const source = reqPair ?? fallbackPair
  if (!source) return null
  return toBaekmanPair(source.국, source.시, 요구액)
}

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const isNumeric = (v) => /[0-9]/.test(String(v ?? ''))
function parseAmount(raw, div) {
  let s = String(raw ?? '').replace(/[,\s]/g, '')
  if (!s || !/[0-9]/.test(s)) return null
  s = s.replace(/[△▲]/g, '-')
  const n = parseFloat(s)
  if (isNaN(n)) return null
  return Math.round(div ? n / 1000 : n)
}

const f = fs.readdirSync(DOCS).map((x) => ({ raw: x, n: x.normalize('NFC') })).find((x) => /경상/.test(x.n) && /25년/.test(x.n))
const rows = Papa.parse(decode(`${DOCS}/${f.raw}`), { header: false, skipEmptyLines: false }).data

let total = 0
let withFunding = 0
const samples = []

for (let i = 5; i < rows.length; i++) {
  const r = rows[i]
  if (!r || r.length < 10) continue
  const c1 = clean(r[1])
  const req = String(r[5] ?? '')
  const adj = String(r[6] ?? '')
  if (!c1 || !(isNumeric(req) || isNumeric(adj))) continue

  // collect review lines until next project (simplified: skip full parser)
}

// Full mini-parse
let cur = null
let records = []
const flush = () => {
  if (!cur) return
  cur.검토내용 = cur._rv.join('\n')
  const f = extractFundingFromReview(cur.검토내용, cur.요구액)
  if (f) {
    cur.funding = f
    withFunding++
  }
  records.push(cur)
  cur = null
}

for (let i = 5; i < rows.length; i++) {
  const r = rows[i]
  if (!r || r.length < 10) continue
  const c0 = clean(r[0])
  const c1raw = String(r[1] ?? '').trim()
  const c1 = clean(r[1])
  const req = String(r[5] ?? '')
  const adj = String(r[6] ?? '')
  const review = String(r[7] ?? '').trim()
  const rowHasBudget = isNumeric(req) || isNumeric(adj) || isNumeric(r[3])
  if (c0 === '합계') continue
  if (c0) {
    flush()
    continue
  }
  if (c1 && rowHasBudget) {
    flush()
    cur = { 사업명: c1, 요구액: parseAmount(req, true), _rv: [] }
    if (review) cur._rv.push(review)
    total++
    continue
  }
  if (cur) {
    if (review) cur._rv.push(review)
  }
}
flush()

console.log(`경상사업 ${total}건 중 재원(국비/시비) 추출: ${withFunding}건 (${((withFunding / total) * 100).toFixed(1)}%)`)
console.log('\n샘플:')
records
  .filter((r) => r.funding)
  .slice(0, 5)
  .forEach((r) => {
    console.log(`- ${r.사업명}: 요구 ${r.요구액}백만원 → 국비 ${r.funding.국비}, 시비 ${r.funding.시비}`)
  })
