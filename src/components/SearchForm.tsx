import { SEARCH_BOXES } from '../types'
import type { SearchBoxKey, SearchQuery } from '../types'

interface SearchFormProps {
  query: SearchQuery
  onChange: (key: SearchBoxKey, value: string) => void
  onSubmit: () => void
  onReset: () => void
}

export function SearchForm({ query, onChange, onSubmit, onReset }: SearchFormProps) {
  return (
    <form
      className="search-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="search-grid">
        {SEARCH_BOXES.map((box) => (
          <label key={box.key} className="search-field">
            <span className="search-field__label">{box.label}</span>
            <input
              type="search"
              className="search-field__input"
              value={query[box.key]}
              placeholder={box.placeholder}
              onChange={(event) => onChange(box.key, event.target.value)}
              autoComplete="off"
              enterKeyHint="search"
            />
          </label>
        ))}
      </div>

      <div className="search-actions">
        <button type="button" className="reset-button" onClick={onReset}>
          지우기
        </button>
        <button type="submit" className="submit-button">
          조회
        </button>
      </div>
      <p className="search-hint">
        최소 한 칸을 입력하세요. 두 칸 이상 입력하면 모두 만족하는 사업만 나옵니다. (띄어쓰기·영문
        대소문자 무시)
      </p>
    </form>
  )
}
