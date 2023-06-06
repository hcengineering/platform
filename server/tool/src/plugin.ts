import { Metadata, plugin, Plugin } from '@hcengineering/platform'

/**
 * @public
 */
export const toolId = 'tool' as Plugin

/**
 * @public
 */
const toolPlugin = plugin(toolId, {
  metadata: {
    Endpoint: '' as Metadata<string>,
    Transactor: '' as Metadata<string>,
    InitWorkspace: '' as Metadata<string>
  }
})

export default toolPlugin
