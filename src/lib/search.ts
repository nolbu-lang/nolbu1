import { SEARCH_BOXES } from '../types'
import type { ProjectRecord, SearchQuery } from '../types'

/** 띄어쓰기 제거 + 소문자 정규화 (영어 대소문자·공백 무시 검색용) */
function normalize(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase()
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
    const matched = active.every(({ field, needle }) =>
      normalize(String(record[field] ?? '')).includes(needle),
    )
    if (matched) {
      total += 1
      if (results.length < limit) {
        results.push(record)
      }
    }
  }

  return { results, total }
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
