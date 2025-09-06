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
      body: Buffer
    ): Promise<string> => {
      const token = generateToken(systemAccountUuid, workspace, { service: 'rekoni' })
      try {
        // Node doesn't support Readable with fetch.

        const r = await ctx.with(
          'rekoni',
          {},
          async (ctx) =>
            await (
              await fetch(`${url}/toText?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`, {
                method: 'POST',
                body,
                keepalive: true,
                headers: {
                  Authorization: 'Bearer ' + token,
                  'Content-type': 'application/octet-stream'
                }
              } as any)
            ).json(),
          { url: `${url}/toText`, name, type }
        )
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
