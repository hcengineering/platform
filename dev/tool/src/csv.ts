import { writeFile } from 'fs/promises'

/**
 * @public
 */
export class CSVWriter<T extends Record<string, string | number>> {
  data: string[] = []
  constructor (readonly fields: Record<keyof T, string>) {
    this.data.push(
      Object.entries(this.fields)
        .map(([key, value]) => `"${value}"`)
        .join(',')
    )
  }

  toStr (val: string | number): string {
    if (typeof val === 'number') {
      return `"${Math.round(val * 100) / 100}"`.replace('.', ',')
    }
    return `"${val}"`
  }

  add (record: T, print: boolean = true): void {
    this.data.push(
      Object.entries(this.fields)
        .map(([key, value]) => this.toStr(record[key]))
        .join(',')
    )
    if (print) {
      console.log(
        Object.entries(this.fields)
          .map(([key, value]) => `${value}=${this.toStr(record[key])}`)
          .join(' ')
      )
    }
  }

  async write (filename: string): Promise<void> {
    return await writeFile(filename, this.data.join('\n'))
  }
}
