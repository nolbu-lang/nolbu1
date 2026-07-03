import fs from 'node:fs'
import Papa from 'papaparse'

const DOCS = '/Users/seungchuloh/Documents'
const OUT = process.argv[2] || '/Users/seungchuloh/심사조서검색앱/data.json'

const DEPT_SUFFIX = /(실|국|과|처|본부|관|단|원|청|위원회|담당관|사업소|의회|센터|소)$/

function readCsv(path) {
  let text = fs.readFileSync(path, 'utf8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return Papa.parse(text, { header: false, skipEmptyLines: false }).data
}

const clean = (v) => (v || '').replace(/\s+/g, ' ').trim()
const hasNum = (v) => /[0-9]/.test((v || '').replace(/[^0-9]/g, '') ? v : '')
const isNumeric = (v) => /[0-9]/.test(v || '')

function pushLine(arr, v) {
  const t = (v || '').trim()
  if (t) arr.push(t)
}

// ---------- 경상사업 (10 columns) ----------
function parseGyeongsang(rows) {
  const records = []
  let dept = ''
  let program = ''
  let cur = null

  const flush = () => {
    if (cur) {
      cur.사업개요 = cur._overview.join(' ').replace(/\s+/g, ' ').trim()
      cur.검토내용 = cur._review.join('\n').trim()
      delete cur._overview
      delete cur._review
      records.push(cur)
      cur = null
    }
  }

  // skip title/header rows (0..4), start at 5
  for (let i = 5; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length < 10) continue
    const c0 = clean(r[0])
    const c1raw = (r[1] || '').trim()
    const c1 = clean(r[1])
    const req = clean(r[5])
    const adj = clean(r[6])
    const prev24 = clean(r[3])
    const diff = clean(r[4])
    const review = (r[7] || '').trim()
    const tong = clean(r[8])
    const rowHasBudget = isNumeric(req) || isNumeric(adj) || isNumeric(prev24)

    if (c0 === '합계') continue

    // department or program line (name in col0, with aggregate budget)
    if (c0) {
      flush()
      if (DEPT_SUFFIX.test(c0)) {
        dept = c0
        program = ''
      } else {
        program = c0
      }
      continue
    }

    // leaf project start: name in col1 + budget on same row
    if (c1 && rowHasBudget) {
      flush()
      cur = {
        type: '경상사업',
        부서명: dept,
        정책사업: program,
        사업명: c1,
        요구액: req,
        조정액: adj,
        증감액: diff,
        예산액_24: prev24,
        통계목: tong,
        _overview: [],
        _review: [],
      }
      pushLine(cur._review, review)
      continue
    }

    // continuation lines belong to current leaf
    if (cur) {
      // overview text (col1), skip repeated dept-name header artifacts
      if (c1raw && clean(c1raw) !== dept) pushLine(cur._overview, c1raw)
      pushLine(cur._review, review)
    }
  }
  flush()
  return records
}

// ---------- 투자사업 (13 columns) ----------
function parseTuja(rows) {
  const records = []
  let dept = ''
  let cur = null

  const flush = () => {
    if (cur) {
      cur.검토내용 = cur._review.join('\n').trim()
      delete cur._review
      records.push(cur)
      cur = null
    }
  }

  for (let i = 2; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length < 13) continue
    const seq = clean(r[0]) // 전체연번
    const c2 = (r[2] || '').trim() // 사업명(개요)
    const c3 = clean(r[3])
    const req = clean(r[8])
    const adj = clean(r[9])
    const review = (r[10] || '').trim()
    const tong = clean(r[11])

    // department header: no 연번, col2 has name, col3 == '계'
    if (!seq && c2 && c3 === '계') {
      flush()
      dept = c2.split('\n')[0].replace(/\(.*$/, '').trim()
      continue
    }

    // leaf project: has 연번 in col0
    if (seq && isNumeric(seq) && c2) {
      flush()
      const name = c2.split('\n')[0].trim()
      cur = {
        type: '투자사업',
        부서명: dept,
        정책사업: '',
        사업명: name,
        사업개요: c2.replace(/\s+/g, ' ').trim(),
        요구액: req,
        조정액: adj,
        증감액: '',
        예산액_24: '',
        통계목: tong,
        _review: [],
      }
      pushLine(cur._review, review)
      continue
    }

    // breakdown / continuation rows: collect 검토내용
    if (cur) {
      pushLine(cur._review, review)
    }
  }
  flush()
  return records
}

// ---------- run ----------
const csvs = fs.readdirSync(DOCS).filter((f) => f.endsWith('.csv'))
let all = []
for (const name of csvs) {
  const rows = readCsv(`${DOCS}/${name}`)
  const cols = rows.find((r) => r.length > 1)?.length
  let recs = []
  if (cols === 10) recs = parseGyeongsang(rows)
  else if (cols === 13) recs = parseTuja(rows)
  else console.warn('Unknown column count for', name, cols)
  console.log(`${name}: ${cols} cols -> ${recs.length} records`)
  all = all.concat(recs)
}

// finalize: ensure 사업개요 exists
for (const rec of all) {
  if (rec.사업개요 == null) rec.사업개요 = ''
}

fs.writeFileSync(OUT, JSON.stringify(all, null, 0), 'utf8')
console.log(`\nTOTAL records: ${all.length}`)
console.log(`written to: ${OUT} (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB)`)

console.log('\n--- sample records ---')
for (const idx of [0, 1, 2, all.length - 3, all.length - 2, all.length - 1]) {
  const s = all[idx]
  if (!s) continue
  console.log(JSON.stringify({
    type: s.type,
    부서명: s.부서명,
    사업명: s.사업명,
    사업개요: (s.사업개요 || '').slice(0, 60),
    검토내용: (s.검토내용 || '').slice(0, 60),
    요구액: s.요구액,
    조정액: s.조정액,
  }, null, 0))
}
