import { exec } from 'child_process'
import { mkdtemp, rm, rmdir, writeFile } from 'fs/promises'
import { contentType } from 'mime-types'
import { tmpdir } from 'os'
import { join } from 'path'
import { rtfExtractor } from './rtf'
import { DocumentExtractor } from './types'

export const docExtractor: DocumentExtractor = {
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
    const tempDir = await mkdtemp(join(tmpdir(), 'rekoni-'))
    const distFileName = join(tempDir, 'content.doc')
    await writeFile(distFileName, data)
    const text = await new Promise<string>((resolve, reject) => {
      exec(
        `antiword -i 1 -f -m UTF-8 "${distFileName}"`,
        { encoding: 'utf-8', cwd: tempDir },
        (error, stdout, stderr) => {
          if (error != null) {
            if (stderr.includes('is not a Word Document. It is probably a Rich Text Format file')) {
              rtfExtractor
                .extract(fileName, type, data)
                .then((value) => {
                  resolve(value)
                })
                .catch((err) => {
                  reject(err)
                })
              return
            }
            reject(new Error(`Error ${JSON.stringify(error)} ${stderr}`))
          } else {
            resolve(stdout)
          }
        }
      )
    })
    await rm(distFileName)
    await rmdir(tempDir)
    return text
  }
}
function isType (type: string): boolean {
  return type === 'application/msword'
}
