import { systemAccountUuid, type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import { type ContentTextAdapter } from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'

/**
 * @public
 */
export async function createRekoniAdapter (url: string): Promise<ContentTextAdapter> {
  return {
    content: async (
      ctx: MeasureContext,
      workspace: WorkspaceUuid,
      name: string,
      type: string,
      doc
    ): Promise<string> => {
      const token = generateToken(systemAccountUuid, workspace, { service: 'rekoni' })
      try {
        const chunks: Buffer[] = []
        let len = 0
        await new Promise<void>((resolve, reject) => {
          doc.on('data', (chunk) => {
            len += chunk.length
            chunks.push(chunk)
            if (len > 30 * 1024 * 1024) {
              reject(new Error('file to big for content processing'))
            }
          })
          doc.on('end', () => {
            resolve()
          })
          doc.on('error', (err) => {
            reject(err)
          })
        })

        const body: Buffer = Buffer.concat(chunks)
        const r = await (
          await fetch(`${url}/toText?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`, {
            method: 'POST',
            body,
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-type': 'application/octet-stream'
            }
          } as any)
        ).json()
        if (r.error !== undefined) {
          throw new Error(JSON.stringify(r.error))
        }
        return r.content
      } catch (err: any) {
        if (err.message === 'Response code 400 (Bad Request)' || err.code === 400) {
          return ''
        }
        throw err
      }
    }
  }
}
