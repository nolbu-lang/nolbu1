import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DatasetRecord, DatasetSummary, ProjectRecord } from '../types'

interface SimsaDB extends DBSchema {
  datasets: {
    key: string
    value: DatasetRecord
    indexes: { 'by-uploadedAt': number }
  }
}

const DB_NAME = 'simsa-joseo-db'
const DB_VERSION = 4

let dbPromise: Promise<IDBPDatabase<SimsaDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<SimsaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 저장 구조가 바뀌었으므로 기존 스토어를 초기화하고 다시 만든다.
        if (db.objectStoreNames.contains('datasets')) {
          db.deleteObjectStore('datasets')
        }
        const store = db.createObjectStore('datasets', { keyPath: 'id' })
        store.createIndex('by-uploadedAt', 'uploadedAt')
      },
    })
  }
  return dbPromise
}

export async function saveDataset(dataset: DatasetRecord): Promise<void> {
  const db = await getDb()
  await db.put('datasets', dataset)
}

export async function deleteDataset(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('datasets', id)
}

export async function getDatasetSummaries(): Promise<DatasetSummary[]> {
  const db = await getDb()
  const datasets = await db.getAllFromIndex('datasets', 'by-uploadedAt')
  return datasets
    .reverse()
    .map(({ id, fileName, type, recordCount, fileSize, uploadedAt }) => ({
      id,
      fileName,
      type,
      recordCount,
      fileSize,
      uploadedAt,
    }))
}

export async function getAllRecords(): Promise<ProjectRecord[]> {
  const db = await getDb()
  const datasets = await db.getAllFromIndex('datasets', 'by-uploadedAt')
  return datasets.flatMap((dataset) => dataset.records)
}
