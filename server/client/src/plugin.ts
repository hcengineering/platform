import { Metadata, plugin, Plugin } from '@hcengineering/platform'

/**
 * @public
 */
export const toolId = 'server-client' as Plugin

/**
 * @public
 */
const serverClientPlugin = plugin(toolId, {
  metadata: {
    Endpoint: '' as Metadata<string>, // Account URL endpoint
    UserAgent: '' as Metadata<string>
  }
})

export default serverClientPlugin
