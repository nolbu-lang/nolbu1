import fs from 'node:fs'
import Papa from 'papaparse'

const files = [
  '/Users/seungchuloh/Documents/25\uba54\ubaa8\ub9ac.csv', // placeholder replaced below
]

// Resolve actual filenames (they contain non-ASCII we can't type reliably)
const dir = '/Users/seungchuloh/Documents'
const csvs = fs.readdirSync(dir).filter((f) => f.endsWith('.csv'))

for (const name of csvs) {
  const full = `${dir}/${name}`
  let text = fs.readFileSync(full, 'utf8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: false })
  const rows = parsed.data
  console.log('\n===================================================')
  console.log('FILE:', name)
  console.log('total rows:', rows.length)
  const colCounts = {}
  for (const r of rows) {
    colCounts[r.length] = (colCounts[r.length] || 0) + 1
  }
  console.log('column-count distribution:', colCounts)
  console.log('--- rows 0..14 (col-indexed) ---')
  for (let i = 0; i < 15 && i < rows.length; i++) {
    console.log(
      i,
      rows[i].map((c, idx) => `[${idx}]${JSON.stringify((c || '').replace(/\n/g, '\u23ce')).slice(0, 30)}`).join(' '),
    )
  }
}
