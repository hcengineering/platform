import { MeasureContext, WorkspaceId } from '@hcengineering/core'
import { ContentTextAdapter } from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'
import got, { HTTPError } from 'got'

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
        const resContent = await got.post(
          `${url}/toText?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`,
          {
            body: doc,
            // timeout: 15000,
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-type': typeof doc === 'string' ? 'text/plain' : 'application/octet-stream'
            }
          }
        )
        const r = JSON.parse(resContent.body ?? '')
        if (r.error !== undefined) {
          throw new Error(r.error)
        }
        return r.content
      } catch (err: any) {
        console.info('Content Processing error', name, type, doc, err.response.body)
        if (err instanceof HTTPError) {
          if (err.message === 'Response code 400 (Bad Request)') {
            return ''
          }
        }
        throw err
      }
    },
    metrics (): MeasureContext {
      return _metrics
    }
  }
}
