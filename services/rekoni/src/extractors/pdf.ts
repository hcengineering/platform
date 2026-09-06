import { exec } from 'child_process'
import { contentType } from 'mime-types'
import { withTempFile } from '../tempfile'
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
    return await withTempFile('content.pdf', data, async (distFileName, tempDir) => {
      return await new Promise<string>((resolve, reject) => {
        exec(`pdftotext -layout "${distFileName}" -`, { encoding: 'utf-8', cwd: tempDir }, (error, stdout, stderr) => {
          if (error != null) {
            reject(new Error(`Error ${JSON.stringify(error)} ${stderr}`))
          } else {
            resolve(stdout)
          }
        })
      })
    })
  }
}
