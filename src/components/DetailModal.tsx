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

export function DetailModal({ record, query, onClose }: DetailModalProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const title = record.통계목 ? `${record.사업명}(${record.통계목})` : record.사업명

  const summaryRows: DetailRow[] = [
    {
      label: '부서명',
      html: highlight(record.부서명, query.부서명),
      compact: true,
    },
  ]

  if (record.정책사업) {
    summaryRows.push({ label: '정책사업', text: record.정책사업, compact: true })
  }

  summaryRows.push(
    {
      label: '요구액',
      text: formatAmountWithSource(
        record.요구액,
        record.요구_국비,
        record.요구_시비,
        record.재원내역,
      ),
      compact: true,
    },
    {
      label: '조정액',
      text: formatAmountWithSource(
        record.조정액,
        record.조정_국비,
        record.조정_시비,
        record.재원내역,
      ),
      compact: true,
    },
  )

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
          <span className={`badge badge--${record.사업유형 === '투자' ? 'invest' : 'operate'}`}>
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
