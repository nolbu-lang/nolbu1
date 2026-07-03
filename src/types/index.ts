export interface ProjectRecord {
  type: string
  /** 예산 년도 (예: "25") */
  년도: string
  /** 예산 차수 (예: "본예산") */
  차수: string
  /** 사업 유형 (예: "경상" | "투자") */
  사업유형: string
  부서명: string
  정책사업: string
  사업명: string
  사업개요: string
  검토내용: string
  조건검색어: string
  통계목: string
  /** 금액은 모두 백만원 단위 정수. 값이 없으면 null */
  요구액: number | null
  조정액: number | null
  요구_국비: number | null
  요구_시비: number | null
  조정_국비: number | null
  조정_시비: number | null
  /** 국비/시비 등 재원별 내역 존재 여부 (투자사업) */
  재원내역: boolean
}

export interface DatasetRecord {
  id: string
  fileName: string
  type: string
  recordCount: number
  fileSize: number
  uploadedAt: number
  records: ProjectRecord[]
}

export interface DatasetSummary {
  id: string
  fileName: string
  type: string
  recordCount: number
  fileSize: number
  uploadedAt: number
}

export type SearchBoxKey = '부서명' | '사업명' | '시행기관' | '조건검색어'

export type SearchQuery = Record<SearchBoxKey, string>

interface SearchBox {
  key: SearchBoxKey
  label: string
  field: keyof ProjectRecord
  placeholder: string
}

export const SEARCH_BOXES: SearchBox[] = [
  { key: '부서명', label: '부서명', field: '부서명', placeholder: '예: 도시공간계획국' },
  { key: '사업명', label: '사업명', field: '사업명', placeholder: '예: 도시재생' },
  { key: '시행기관', label: '시행기관', field: '사업개요', placeholder: '예: 운영 지원' },
  { key: '조건검색어', label: '조건검색어', field: '조건검색어', placeholder: '예: #중점, 준공' },
]

export const EMPTY_QUERY: SearchQuery = {
  부서명: '',
  사업명: '',
  시행기관: '',
  조건검색어: '',
}
