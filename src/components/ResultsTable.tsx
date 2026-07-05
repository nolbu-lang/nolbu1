import { formatTableAmount, typeShort } from '../lib/format'
import { highlight } from '../lib/search'
import type { ProjectRecord, SearchQuery } from '../types'

interface ResultsTableProps {
  results: ProjectRecord[]
  query: SearchQuery
  onSelect: (record: ProjectRecord) => void
}

export function ResultsTable({ results, query, onSelect }: ResultsTableProps) {
  return (
    <div className="table-scroll">
      <table className="results-table">
        <thead>
          <tr>
            <th className="col-type">유형</th>
            <th className="col-name">사업명</th>
            <th className="col-num">요구액</th>
            <th className="col-num">조정액</th>
            <th className="col-dept">부서명</th>
          </tr>
        </thead>
        <tbody>
          {results.map((record, index) => (
            <tr
              key={`${record.부서명}-${record.사업명}-${index}`}
              onClick={() => onSelect(record)}
            >
              <td className="col-type">
                <span className="type-line">{typeShort(record)}</span>
                <span
                  className={`badge badge--${record.사업유형 === '투자' ? 'invest' : 'operate'}`}
                >
                  {record.사업유형 || record.type.replace('사업', '')}
                </span>
              </td>
              <td className="col-name">
                <span className="cell-name">
                  <span
                    dangerouslySetInnerHTML={{ __html: highlight(record.사업명, query.사업명) }}
                  />
                  {record.통계목 && <span className="cell-tong">({record.통계목})</span>}
                </span>
              </td>
              <td className="col-num">{formatTableAmount(record.요구액)}</td>
              <td className="col-num">{formatTableAmount(record.조정액)}</td>
              <td
                className="col-dept"
                dangerouslySetInnerHTML={{ __html: highlight(record.부서명, query.부서명) }}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
