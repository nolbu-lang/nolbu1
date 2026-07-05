import Papa from 'papaparse'
import type { ProjectRecord } from '../types'

const clean = (v: unknown): string => String(v ?? '').replace(/\s+/g, ' ').trim()
const isNumeric = (v: unknown): boolean => /[0-9]/.test(String(v ?? ''))

function pushLine(arr: string[], v: unknown) {
  const t = String(v ?? '').trim()
  if (t) arr.push(t)
}

/** 여러 줄 텍스트에서 빈 줄(연속 줄바꿈)을 하나의 줄바꿈으로 합친다. */
function collapseBlankLines(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
}

/** "846,000", "△13,500" 등을 숫자로 변환. divideBy1000이면 천원→백만원 변환. */
function parseAmount(raw: unknown, divideBy1000: boolean): number | null {
  let s = String(raw ?? '').replace(/[,\s]/g, '')
  if (!s || !/[0-9]/.test(s)) return null
  s = s.replace(/[△▲]/g, '-')
  const n = Number.parseFloat(s)
  if (Number.isNaN(n)) return null
  return Math.round(divideBy1000 ? n / 1000 : n)
}

/** 파일을 UTF-8로 우선 해석하고, 실패하면 EUC-KR(CP949)로 재시도한다. */
async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    text = new TextDecoder('euc-kr').decode(buffer)
  }
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }
  return text
}

interface Meta {
  년도: string
  차수: string
  사업유형: string
}

function extractMeta(title: string, fileName: string): Meta {
  const src = `${title} ${fileName}`

  let 사업유형 = ''
  if (/경상/.test(src)) 사업유형 = '경상'
  else if (/투자/.test(src)) 사업유형 = '투자'

  let 년도 = ''
  const yTitle = title.match(/'?\s*(\d{2})\s*[.년]/)
  const yFile = fileName.match(/(\d{2})\s*년/) ?? fileName.match(/(\d{2})/)
  년도 = (yTitle?.[1] ?? yFile?.[1] ?? '').trim()

  let 차수 = ''
  const chasuNum = src.match(/제?\s*(\d)\s*회?\s*추(?:가경정|경)/)
  if (chasuNum) 차수 = `제${chasuNum[1]}회 추경`
  else if (/추가경정|추경/.test(src)) 차수 = '추경'
  else if (/본예산/.test(src)) 차수 = '본예산'

  return { 년도, 차수, 사업유형 }
}

type Row = string[]

function baseRecord(meta: Meta): ProjectRecord {
  return {
    type: meta.사업유형 === '투자' ? '투자사업' : '경상사업',
    년도: meta.년도,
    차수: meta.차수,
    사업유형: meta.사업유형,
    부서명: '',
    정책사업: '',
    사업명: '',
    사업개요: '',
    검토내용: '',
    조건검색어: '',
    통계목: '',
    요구액: null,
    조정액: null,
    요구_국비: null,
    요구_시비: null,
    조정_국비: null,
    조정_시비: null,
    재원내역: false,
  }
}

// ---------- 경상사업 (10열, 단위: 천원) ----------
function parseGyeongsang(rows: Row[], meta: Meta): ProjectRecord[] {
  const records: ProjectRecord[] = []
  let 상위부서 = ''
  let 하위부서 = ''
  let program = ''
  let cur: (ProjectRecord & { _ov: string[]; _rv: string[]; _kw: string[] }) | null = null

  const flush = () => {
    if (!cur) return
    cur.사업개요 = cur._ov.join('\n')
    cur.검토내용 = collapseBlankLines(cur._rv.join('\n'))
    cur.조건검색어 = cur._kw.join(' ').replace(/\s+/g, ' ').trim()

    const { _ov, _rv, _kw, ...record } = cur
    void _ov
    void _rv
    void _kw
    records.push(record)
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
    const tong = clean(r[8])
    const keyword = String(r[9] ?? '').trim()
    const rowHasBudget = isNumeric(req) || isNumeric(adj) || isNumeric(r[3])

    if (c0 === '합계') continue

    if (c0) {
      flush()
      const hasSpace = /\s/.test(c0)
      if (!hasSpace && /(과|담당관)$/.test(c0)) {
        하위부서 = c0
      } else if (!hasSpace && /(국|실|본부|처|위원회|청|관|원|센터|사업소|단)$/.test(c0)) {
        상위부서 = c0
        하위부서 = ''
      } else {
        program = c0
      }
      continue
    }

    if (c1 && rowHasBudget) {
      flush()
      cur = {
        ...baseRecord(meta),
        // 경상사업은 '과'만 표시한다. '과'가 없으면 상위부서로 대체(빈 값 방지).
        부서명: 하위부서 || 상위부서,
        정책사업: program,
        사업명: c1,
        통계목: tong,
        요구액: parseAmount(req, true),
        조정액: parseAmount(adj, true),
        _ov: [],
        _rv: [],
        _kw: [],
      }
      pushLine(cur._rv, review)
      pushLine(cur._kw, keyword)
      continue
    }

    if (cur) {
      if (c1raw && c1 !== 상위부서 && c1 !== 하위부서 && c1 !== program) {
        pushLine(cur._ov, c1raw)
      }
      pushLine(cur._rv, review)
      pushLine(cur._kw, keyword)
    }
  }
  flush()
  return records
}

// ---------- 투자사업 (13열, 단위: 백만원) ----------
function parseTuja(rows: Row[], meta: Meta): ProjectRecord[] {
  const records: ProjectRecord[] = []
  let 국 = ''
  let cur: (ProjectRecord & { _ov: string[]; _rv: string[]; _kw: string[] }) | null = null

  const flush = () => {
    if (!cur) return
    // 사업개요에서 담당 '과' 추출 (예: "도시공간계획과, ...")
    let 과 = ''
    for (const line of cur._ov) {
      const m = line.match(/^([가-힣A-Za-z0-9]{2,12}과)(?:[,\s]|$)/)
      if (m) {
        과 = m[1]
        break
      }
    }
    cur.부서명 = [국, 과].filter(Boolean).join(' ')
    cur.사업개요 = cur._ov.join('\n')
    cur.검토내용 = collapseBlankLines(cur._rv.join('\n'))
    cur.조건검색어 = cur._kw.join(' ').replace(/\s+/g, ' ').trim()
    const { _ov, _rv, _kw, ...record } = cur
    void _ov
    void _rv
    void _kw
    records.push(record)
    cur = null
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length < 13) continue
    const seq = clean(r[0])
    const c2raw = String(r[2] ?? '').trim()
    const c2 = c2raw.replace(/\s+/g, ' ').trim()
    const c3 = clean(r[3])
    const c4 = clean(r[4])
    const col8 = String(r[8] ?? '')
    const col9 = String(r[9] ?? '')
    const review = String(r[10] ?? '').trim()
    const tong = clean(r[11])
    const keyword = String(r[12] ?? '').trim()

    // 부서 헤더 (연번 없음 + c3='계')
    if (!seq && c2 && c3 === '계') {
      flush()
      국 = c2raw.split('\n')[0].replace(/\(.*$/, '').trim()
      continue
    }

    // 사업 시작 (연번 있음)
    if (seq && isNumeric(seq) && c2) {
      flush()
      cur = {
        ...baseRecord(meta),
        사업명: c2raw.split('\n')[0].trim(),
        통계목: tong,
        요구액: parseAmount(col8, false),
        조정액: parseAmount(col9, false),
        재원내역: true,
        _ov: [],
        _rv: [],
        _kw: [],
      }
      pushLine(cur._rv, review)
      pushLine(cur._kw, keyword)
      continue
    }

    if (cur) {
      if (c4 === '시비') {
        cur.요구_시비 = parseAmount(col8, false)
        cur.조정_시비 = parseAmount(col9, false)
      } else if (c4 === '국비') {
        cur.요구_국비 = parseAmount(col8, false)
        cur.조정_국비 = parseAmount(col9, false)
      }
      if (c2raw && c2 !== cur.사업명) {
        pushLine(cur._ov, c2raw)
      }
      pushLine(cur._rv, review)
      pushLine(cur._kw, keyword)
    }
  }
  flush()
  return records
}

export interface ParseResult {
  type: string
  records: ProjectRecord[]
}

export async function parseCsvFile(file: File): Promise<ParseResult> {
  const text = await readFileText(file)
  const fileName = (file.name ?? '').normalize('NFC')
  const parsed = Papa.parse<string[]>(text, { header: false, skipEmptyLines: false })
  const rows = parsed.data as Row[]

  const title = String(rows[0]?.[0] ?? '').normalize('NFC')
  const colCount = mostCommonColumnCount(rows)
  const meta = extractMeta(title, fileName)

  let records: ProjectRecord[]
  let type: string
  if (colCount === 10) {
    if (!meta.사업유형) meta.사업유형 = '경상'
    records = parseGyeongsang(rows, meta)
    type = '경상사업'
  } else if (colCount === 13) {
    if (!meta.사업유형) meta.사업유형 = '투자'
    records = parseTuja(rows, meta)
    type = '투자사업'
  } else {
    throw new Error(
      `지원하지 않는 형식입니다. (열 개수: ${colCount})\n심사조서 CSV(경상사업 10열 / 투자사업 13열)만 업로드할 수 있습니다.`,
    )
  }

  if (records.length === 0) {
    throw new Error('데이터에서 사업 항목을 찾지 못했습니다. 파일 내용을 확인해주세요.')
  }

  return { type, records }
}

function mostCommonColumnCount(rows: Row[]): number {
  const counts = new Map<number, number>()
  for (const r of rows) {
    if (!r || r.length <= 1) continue
    counts.set(r.length, (counts.get(r.length) ?? 0) + 1)
  }
  let best = 0
  let bestCount = 0
  for (const [cols, n] of counts) {
    if (n > bestCount) {
      best = cols
      bestCount = n
    }
  }
  return best
}
