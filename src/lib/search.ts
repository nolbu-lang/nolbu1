import { SEARCH_BOXES } from '../types'
import type { ProjectRecord, SearchQuery, SearchableField } from '../types'

/** 띄어쓰기 제거 + 소문자 정규화 (영어 대소문자·공백 무시 검색용) */
export function normalize(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase()
}

export function attachSearchNorms(record: ProjectRecord): ProjectRecord {
  if (record._norm) return record
  const norm = (value: string) => normalize(String(value ?? ''))
  return {
    ...record,
    _norm: {
      부서명: norm(record.부서명),
      사업명: norm(record.사업명),
      사업개요: norm(record.사업개요),
      조건검색어: norm(record.조건검색어),
    },
  }
}

export function attachSearchNormsAll(records: ProjectRecord[]): ProjectRecord[] {
  return records.map(attachSearchNorms)
}

function normalizedField(record: ProjectRecord, field: SearchableField): string {
  return record._norm?.[field] ?? normalize(String(record[field] ?? ''))
}

/** 사업명별로 묶고, 그룹은 최대 조정액 큰 순 → 그룹 안에서는 조정액 큰 순 */
export function sortSearchResults(records: ProjectRecord[]): ProjectRecord[] {
  const groupMax = new Map<string, number>()
  for (const record of records) {
    const adj = record.조정액 ?? -Infinity
    const prev = groupMax.get(record.사업명)
    if (prev === undefined || adj > prev) groupMax.set(record.사업명, adj)
  }

  return [...records].sort((a, b) => {
    const maxA = groupMax.get(a.사업명) ?? -Infinity
    const maxB = groupMax.get(b.사업명) ?? -Infinity
    if (maxB !== maxA) return maxB - maxA
    const byName = a.사업명.localeCompare(b.사업명, 'ko')
    if (byName !== 0) return byName
    return (b.조정액 ?? -Infinity) - (a.조정액 ?? -Infinity)
  })
}

export function hasQuery(query: SearchQuery): boolean {
  return SEARCH_BOXES.some((box) => query[box.key].trim().length > 0)
}

export function searchProjects(
  records: ProjectRecord[],
  query: SearchQuery,
  limit = 500,
): { results: ProjectRecord[]; total: number } {
  const active = SEARCH_BOXES.map((box) => ({
    field: box.field,
    needle: normalize(query[box.key]),
  })).filter((entry) => entry.needle.length > 0)

  if (active.length === 0) {
    return { results: [], total: 0 }
  }

  const results: ProjectRecord[] = []
  let total = 0

  for (const record of records) {
    let matched = true
    for (const { field, needle } of active) {
      if (!normalizedField(record, field as SearchableField).includes(needle)) {
        matched = false
        break
      }
    }
    if (matched) {
      total += 1
      results.push(record)
    }
  }

  const sorted = sortSearchResults(results)
  return { results: sorted.slice(0, limit), total }
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 공백을 무시하고 매칭하므로, 검색어의 각 글자 사이에 임의의 공백을 허용하는
 * 정규식으로 원문에서 강조할 구간을 찾는다.
 */
export function highlight(text: string, query: string): string {
  const escapedText = escapeHtml(text)
  const chars = query.replace(/\s+/g, '').split('')
  if (chars.length === 0) {
    return escapedText
  }
  const pattern = chars.map((ch) => escapeRegExp(escapeHtml(ch))).join('\\s*')
  try {
    const regex = new RegExp(`(${pattern})`, 'gi')
    return escapedText.replace(regex, '<mark>$1</mark>')
  } catch {
    return escapedText
  }
}
