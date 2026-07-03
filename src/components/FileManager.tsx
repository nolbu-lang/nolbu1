import { useRef, useState } from 'react'
import { formatDate, formatFileSize } from '../lib/format'
import { generateId } from '../lib/id'
import { parseCsvFile } from '../lib/parser'
import { deleteDataset, saveDataset } from '../lib/db'
import type { DatasetSummary } from '../types'

interface FileManagerProps {
  datasets: DatasetSummary[]
  onChanged: () => void | Promise<void>
}

export function FileManager({ datasets, onChanged }: FileManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    setBusy(true)
    setError(null)
    setNotice(null)

    const added: string[] = []
    try {
      for (const file of files) {
        const { type, records } = await parseCsvFile(file)
        await saveDataset({
          id: generateId(),
          fileName: file.name,
          type,
          recordCount: records.length,
          fileSize: file.size,
          uploadedAt: Date.now(),
          records,
        })
        added.push(`${file.name} (${records.length.toLocaleString()}건)`)
      }
      await onChanged()
      setNotice(`업로드 완료: ${added.join(', ')}`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '업로드에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string, fileName: string) {
    if (!window.confirm(`"${fileName}" 파일을 삭제할까요?`)) return
    await deleteDataset(id)
    await onChanged()
    setNotice(`삭제 완료: ${fileName}`)
  }

  const totalRecords = datasets.reduce((sum, dataset) => sum + dataset.recordCount, 0)

  return (
    <section className="file-manager">
      <div className="file-manager__actions">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,text/csv"
          multiple
          hidden
          onChange={handleFiles}
        />
        <button
          type="button"
          className="submit-button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? '처리 중…' : '＋ CSV 파일 올리기'}
        </button>
        <p className="search-hint">
          내 폰에만 저장됩니다. 엑셀은 CSV로 저장해 올리세요. (경상사업/투자사업 심사조서)
        </p>
      </div>

      {error && <p className="banner-error">{error}</p>}
      {notice && <p className="banner-notice">{notice}</p>}

      <div className="file-manager__summary">
        저장된 파일 {datasets.length}개 · 총 {totalRecords.toLocaleString()}건
      </div>

      {datasets.length === 0 ? (
        <div className="empty-state">
          <p>아직 올린 파일이 없습니다.</p>
          <p className="hint">위 버튼으로 CSV 파일을 올리면 검색할 수 있습니다.</p>
        </div>
      ) : (
        <ul className="file-list">
          {datasets.map((dataset) => (
            <li key={dataset.id} className="file-card">
              <div className="file-card__body">
                <div className="file-card__title">
                  <span
                    className={`badge badge--${dataset.type === '투자사업' ? 'invest' : 'operate'}`}
                  >
                    {dataset.type.replace('사업', '')}
                  </span>
                  <strong>{dataset.fileName}</strong>
                </div>
                <div className="file-card__meta">
                  <span>{dataset.recordCount.toLocaleString()}건</span>
                  <span>{formatFileSize(dataset.fileSize)}</span>
                  <span>{formatDate(dataset.uploadedAt)}</span>
                </div>
              </div>
              <button
                type="button"
                className="danger-button"
                onClick={() => handleDelete(dataset.id, dataset.fileName)}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
