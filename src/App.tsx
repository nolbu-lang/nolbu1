import { useCallback, useEffect, useMemo, useState } from 'react'
import { DetailModal } from './components/DetailModal'
import { FileManager } from './components/FileManager'
import { ResultsTable } from './components/ResultsTable'
import { SearchForm } from './components/SearchForm'
import { getAllRecords, getDatasetSummaries } from './lib/db'
import { attachSearchNormsAll, hasQuery, searchProjects } from './lib/search'
import { EMPTY_QUERY } from './types'
import type { DatasetSummary, ProjectRecord, SearchBoxKey, SearchQuery } from './types'
import './App.css'

type View = 'search' | 'files'

const RESULT_LIMIT = 500

function App() {
  const [view, setView] = useState<View>('search')
  const [records, setRecords] = useState<ProjectRecord[]>([])
  const [datasets, setDatasets] = useState<DatasetSummary[]>([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState<SearchQuery>(EMPTY_QUERY)
  const [submitted, setSubmitted] = useState<SearchQuery | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ProjectRecord | null>(null)

  const refresh = useCallback(async () => {
    const [summaries, allRecords] = await Promise.all([
      getDatasetSummaries(),
      getAllRecords(),
    ])
    setDatasets(summaries)
    setRecords(attachSearchNormsAll(allRecords))
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const { results, total } = useMemo(() => {
    if (!submitted) return { results: [] as ProjectRecord[], total: 0 }
    return searchProjects(records, submitted, RESULT_LIMIT)
  }, [records, submitted])

  const handleChange = (key: SearchBoxKey, value: string) =>
    setQuery((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = () => {
    if (records.length === 0) {
      setFormError('먼저 [파일] 탭에서 CSV 파일을 올려주세요.')
      setSubmitted(null)
      return
    }
    if (!hasQuery(query)) {
      setFormError('최소 한 개의 검색창에 검색어를 입력하세요.')
      setSubmitted(null)
      return
    }
    setFormError(null)
    setSubmitted({ ...query })
  }

  const handleReset = () => {
    setQuery(EMPTY_QUERY)
    setSubmitted(null)
    setFormError(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="app-header__eyebrow">오프라인 검색</p>
          <h1>심사조서 검색</h1>
        </div>
        <div className="app-header__stats">
          <span>{datasets.length}개 파일</span>
          <span>{records.length.toLocaleString()}건</span>
        </div>
      </header>

      <main className="app-body">
        {view === 'search' ? (
          <>
            <SearchForm
              query={query}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onReset={handleReset}
            />

            {formError && <p className="banner-error">{formError}</p>}

            <div className="result-meta">
              {loading
                ? '데이터 불러오는 중…'
                : submitted === null
                  ? '검색창에 입력 후 [조회]를 누르세요.'
                  : total === 0
                    ? '검색 결과가 없습니다.'
                    : `검색결과 ${total.toLocaleString()}건, 단위 : 백만원${
                        total > RESULT_LIMIT ? ` (상위 ${RESULT_LIMIT.toLocaleString()}건 표시)` : ''
                      }`}
            </div>

            {submitted !== null && results.length > 0 && (
              <ResultsTable results={results} query={submitted} onSelect={setSelected} />
            )}
          </>
        ) : (
          <FileManager datasets={datasets} onChanged={refresh} />
        )}
      </main>

      <nav className="bottom-nav" aria-label="주요 메뉴">
        <button
          type="button"
          className={view === 'search' ? 'active' : ''}
          onClick={() => setView('search')}
        >
          검색
        </button>
        <button
          type="button"
          className={view === 'files' ? 'active' : ''}
          onClick={() => setView('files')}
        >
          파일 {datasets.length > 0 && <span className="nav-badge">{datasets.length}</span>}
        </button>
      </nav>

      {selected && submitted && (
        <DetailModal record={selected} query={submitted} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

export default App
