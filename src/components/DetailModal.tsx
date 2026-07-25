import { useEffect } from 'react'
import { formatAmountWithSource, typeLabel } from '../lib/format'
import { highlight } from '../lib/search'
import type { ProjectRecord, SearchQuery } from '../types'

interface DetailModalProps {
  record: ProjectRecord
  query: SearchQuery
  onClose: () => void
}

interface DetailRow {
  label: string
  html?: string
  text?: string
  compact?: boolean
}

function DetailTable({
  rows,
  className = '',
}: {
  rows: DetailRow[]
  className?: string
}) {
  return (
    <table className={`detail-table ${className}`.trim()}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className={row.compact ? 'detail-table__row-compact' : undefined}>
            <th scope="row">{row.label}</th>
            <td
              className={row.compact ? undefined : 'detail-table__multiline'}
              {...(row.html
                ? { dangerouslySetInnerHTML: { __html: row.html } }
                : { children: row.text })}
            />
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function amountRow(
  label: string,
  total: number | null,
  국비: number | null,
  시비: number | null,
  hasSource: boolean,
): DetailRow {
  return {
    label,
    text: formatAmountWithSource(total, 국비, 시비, hasSource),
    compact: true,
  }
}

export function DetailModal({ record, query, onClose }: DetailModalProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const title = record.통계목 ? `${record.사업명}(${record.통계목})` : record.사업명
  const isInvest = record.사업유형 === '투자' || record.type === '투자사업'

  const summaryRows: DetailRow[] = [
    {
      label: '부서명',
      html: highlight(record.부서명, query.부서명),
      compact: true,
    },
  ]

  if (isInvest) {
    summaryRows.push(
      amountRow(
        '총사업비',
        record.총사업비,
        record.총사업비_국비,
        record.총사업비_시비,
        record.재원내역,
      ),
      amountRow('요구액', record.요구액, record.요구_국비, record.요구_시비, record.재원내역),
      amountRow('조정액', record.조정액, record.조정_국비, record.조정_시비, record.재원내역),
    )
  } else {
    // 경상: 정책사업 미표시. 기정액 하위 국·시 재원 표기를 요구액·조정액에도 동일 적용
    const hasGijeongSource =
      record.재원내역 && (record.기정_국비 != null || record.기정_시비 != null)
    const showReqSource =
      hasGijeongSource && (record.요구_국비 != null || record.요구_시비 != null)
    const showAdjSource =
      hasGijeongSource && (record.조정_국비 != null || record.조정_시비 != null)
    summaryRows.push(
      amountRow('기정액', record.기정액, record.기정_국비, record.기정_시비, hasGijeongSource),
      amountRow('요구액', record.요구액, record.요구_국비, record.요구_시비, showReqSource),
      amountRow('조정액', record.조정액, record.조정_국비, record.조정_시비, showAdjSource),
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal--detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <span className={`badge badge--${isInvest ? 'invest' : 'operate'}`}>
            {typeLabel(record)}
          </span>
          <button type="button" className="modal__close" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>

        <h2
          id="detail-modal-title"
          className="modal__title"
          dangerouslySetInnerHTML={{ __html: highlight(title, query.사업명) }}
        />

        <div className="modal__body">
          <section className="detail-section">
            <h3 className="detail-section__title">기본 정보</h3>
            <DetailTable rows={summaryRows} className="detail-table--summary" />
          </section>

          {record.사업개요 && (
            <section className="detail-section">
              <h3 className="detail-section__title">사업개요</h3>
              <table className="detail-table detail-table--block">
                <tbody>
                  <tr>
                    <td
                      className="detail-table__multiline"
                      dangerouslySetInnerHTML={{
                        __html: highlight(record.사업개요, query.시행기관),
                      }}
                    />
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {record.검토내용 && (
            <section className="detail-section">
              <h3 className="detail-section__title">검토내용</h3>
              <table className="detail-table detail-table--block">
                <tbody>
                  <tr>
                    <td className="detail-table__multiline">{record.검토내용}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
