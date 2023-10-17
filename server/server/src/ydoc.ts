import { MeasureContext, WorkspaceId } from '@hcengineering/core'
import { ContentTextAdapter } from '@hcengineering/server-core'
import { ReferenceNode, defaultExtensions, getText, yDocContentToNodes } from '@hcengineering/text'
import { Readable } from 'stream'

const extensions = [...defaultExtensions, ReferenceNode]

/**
 * @public
 */
export async function createYDocAdapter (
  _url: string,
  _workspace: WorkspaceId,
  _metrics: MeasureContext
): Promise<ContentTextAdapter> {
  return {
    content: async (_name: string, _type: string, data: Readable | Buffer | string): Promise<string> => {
      const chunks: Buffer[] = []

      if (data instanceof Readable) {
        await new Promise((resolve) => {
          data.on('readable', () => {
            let chunk
            while ((chunk = data.read()) !== null) {
              const b = chunk as Buffer
              chunks.push(b)
            }
          })

          data.on('end', () => {
            resolve(null)
          })
        })
      } else if (data instanceof Buffer) {
        chunks.push(data)
      } else {
        console.warn('ydoc content adapter does not support string content')
      }

      if (chunks.length > 0) {
        const nodes = yDocContentToNodes(extensions, Buffer.concat(chunks))
        return nodes.map(getText).join('\n')
      }

      return ''
    },
    metrics (): MeasureContext {
      return _metrics
    }
  }
}
