import { parse } from 'csv-parse'

export async function parseCSV (csvData: string): Promise<any[]> {
  return await new Promise((resolve, reject) => {
    parse(
      csvData,
      {
        delimiter: ';',
        columns: true,
        quote: '"',
        bom: true,
        cast: true,
        autoParse: true,
        castDate: false,
        skipEmptyLines: true,
        skipRecordsWithEmptyValues: true
      },
      (err, records) => {
        if (err !== undefined) {
          console.error(err)
          reject(err)
        }
        resolve(records)
      }
    )
  })
}
