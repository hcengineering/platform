import { type MeasureContext, type WorkspaceId } from '@hcengineering/core'
import { type ContentTextAdapter } from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'

/**
 * @public
 */
export async function createRekoniAdapter (
  url: string,
  workspace: WorkspaceId,
  _metrics: MeasureContext
): Promise<ContentTextAdapter> {
  const token = generateToken('anticrm-hcenginnering', workspace)
  return {
    content: async (name: string, type: string, doc): Promise<string> => {
      try {
        // Node doesn't support Readable with fetch.
        const chunks: any[] = []
        let len = 0
        await new Promise<void>((resolve, reject) => {
          doc.on('data', (chunk) => {
            len += (chunk as Buffer).length
            chunks.push(chunk)
            if (len > 10 * 1024 * 1024) {
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
            // timeout: 15000,
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-type': typeof doc === 'string' ? 'text/plain' : 'application/octet-stream'
            }
          } as any)
        ).json()
        if (r.error !== undefined) {
          throw new Error(r.error)
        }
        return r.content
      } catch (err: any) {
        console.info('Content Processing error', name, type, doc, err.response.body)
        if (err.message === 'Response code 400 (Bad Request)' || err.code === 400) {
          return ''
        }
        throw err
      }
    },
    metrics (): MeasureContext {
      return _metrics
    }
  }
}
