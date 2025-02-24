import { exec } from 'child_process'
import { mkdtemp, rm, rmdir, writeFile } from 'fs/promises'
import { contentType } from 'mime-types'
import { tmpdir } from 'os'
import { join } from 'path'
import { DocumentExtractor } from './types'

export const pdfExtractor: DocumentExtractor = {
  async isMatch (fileName: string, type: string | false, data): Promise<boolean> {
    if (type === false) return false
    if (type.includes('application/pdf')) {
      return true
    }
    // Try detect by fileName
    type = contentType(fileName)
    if (type === 'application/pdf') {
      return true
    }

    // TODO: Try detect from buffer
    return false
  },

  async extract (fileName: string, type: string, data): Promise<string> {
    const tempDir = await mkdtemp(join(tmpdir(), 'rekoni-'))
    const distFileName = join(tempDir, 'content.pdf')
    await writeFile(distFileName, data)

    const text = await new Promise<string>((resolve, reject) => {
      exec(`pdftotext -layout "${distFileName}" -`, { encoding: 'utf-8', cwd: tempDir }, (error, stdout, stderr) => {
        if (error != null) {
          reject(new Error(`Error ${JSON.stringify(error)} ${stderr}`))
        } else {
          resolve(stdout)
        }
      })
    })
    await rm(distFileName)
    await rmdir(tempDir)
    return text
  }
}
