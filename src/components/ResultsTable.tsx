import { formatSourceFileName, formatTableAmount } from '../lib/format'
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
            <th className="col-source">파일명</th>
            <th className="col-name">사업명</th>
            <th className="col-num">요구액</th>
            <th className="col-num">조정액</th>
            <th className="col-dept">부서명</th>
          </tr>
        </thead>
        <tbody>
          {results.map((record, index) => (
            <tr
              key={`${record.파일명}-${record.부서명}-${record.사업명}-${index}`}
              onClick={() => onSelect(record)}
            >
              <td className="col-source">
                <span className="cell-source">{formatSourceFileName(record.파일명)}</span>
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
