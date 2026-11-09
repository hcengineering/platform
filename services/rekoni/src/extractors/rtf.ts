import { exec } from 'child_process'
import { contentType } from 'mime-types'
import { withTempFile } from '../tempfile'
import { convertString } from './html'
import { DocumentExtractor } from './types'

export const rtfExtractor: DocumentExtractor = {
  async isMatch (fileName: string, type: string | false, data): Promise<boolean> {
    if (type === false) return false
    if (isType(type)) {
      return true
    }
    // Try detect by fileName
    type = contentType(fileName)
    return type === false ? false : isType(type)
  },

  async extract (fileName: string, type: string, data): Promise<string> {
    const htmlText = await withTempFile('content.rtf', data, async (distFileName, tempDir) => {
      return await new Promise<string>((resolve, reject) => {
        exec(
          `unrtf --nopict --html "${distFileName}"`,
          { encoding: 'utf-8', cwd: tempDir },
          (error, stdout, stderr) => {
            if (error != null) {
              reject(new Error(`Error ${JSON.stringify(error)} ${stderr}`))
            } else {
              resolve(stdout)
            }
          }
        )
      })
    })

    return convertString(htmlText)
  }
}
function isType (type: string): boolean {
  return type === 'application/rtf' || type === 'text/rtf'
}
