import { useEffect } from 'react'
import { formatAmountWithSource, typeLabel } from '../lib/format'
import { highlight } from '../lib/search'
import type { ProjectRecord, SearchQuery } from '../types'

interface DetailModalProps {
  record: ProjectRecord
  query: SearchQuery
  onClose: () => void
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
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
          className="modal__title"
          dangerouslySetInnerHTML={{ __html: highlight(title, query.사업명) }}
        />

        <dl className="modal__fields">
          <div>
            <dt>부서명</dt>
            <dd dangerouslySetInnerHTML={{ __html: highlight(record.부서명, query.부서명) }} />
          </div>
          {record.정책사업 && (
            <div>
              <dt>정책사업</dt>
              <dd>{record.정책사업}</dd>
            </div>
          )}
          <div className="modal__row-2">
            <div>
              <dt>요구액</dt>
              <dd>
                {formatAmountWithSource(
                  record.요구액,
                  record.요구_국비,
                  record.요구_시비,
                  record.재원내역,
                )}
              </dd>
            </div>
            <div>
              <dt>조정액</dt>
              <dd>
                {formatAmountWithSource(
                  record.조정액,
                  record.조정_국비,
                  record.조정_시비,
                  record.재원내역,
                )}
              </dd>
            </div>
          </div>
          {record.사업개요 && (
            <div>
              <dt>사업개요</dt>
              <dd
                className="modal__multiline"
                dangerouslySetInnerHTML={{ __html: highlight(record.사업개요, query.시행기관) }}
              />
            </div>
          )}
          {record.검토내용 && (
            <div>
              <dt>검토내용</dt>
              <dd className="modal__multiline">{record.검토내용}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
