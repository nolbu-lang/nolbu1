import type { ProjectRecord } from '../types'

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

/** 백만원 단위 금액 표시. 값이 없으면 '-' */
export function formatAmount(value: number | null): string {
  if (value == null) return '-'
  return `${value.toLocaleString('ko-KR')}백만원`
}

/** 표 목록용 금액(숫자만). 값이 없으면 '-' */
export function formatTableAmount(value: number | null): string {
  if (value == null) return '-'
  return value.toLocaleString('ko-KR')
}

/**
 * 요구액/조정액을 "000백만원(국비000, 시비000)" 형태로 표시한다.
 * 재원 내역(국비/시비)이 있으면 괄호로 함께 표기한다.
 */
export function formatAmountWithSource(
  total: number | null,
   국비: number | null,
   시비: number | null,
  hasSource: boolean,
): string {
  if (total == null && !hasSource) return '-'
  const base = total == null ? '0백만원' : `${total.toLocaleString('ko-KR')}백만원`
  const showSource = hasSource && (국비 != null || 시비 != null)
  if (!showSource) return base
  const 국 = (국비 ?? 0).toLocaleString('ko-KR')
  const 시 = (시비 ?? 0).toLocaleString('ko-KR')
  return `${base} (국비 ${국}, 시비 ${시})`
}

/** 유형 라벨: "25 본예산 경상사업" 형태 */
export function typeLabel(record: ProjectRecord): string {
  const parts = [record.년도, record.차수, record.사업유형 ? `${record.사업유형}사업` : '']
  return parts.filter(Boolean).join(' ')
}

/** 표에서 쓰는 짧은 유형 라벨: "25 본예산" */
export function typeShort(record: ProjectRecord): string {
  return [record.년도, record.차수].filter(Boolean).join(' ')
}
