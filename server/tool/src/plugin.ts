import { Metadata, plugin, Plugin } from '@anticrm/platform'

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
    Transactor: '' as Metadata<string>
  }
})

export default toolPlugin
