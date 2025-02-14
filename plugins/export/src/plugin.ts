import { Class, Ref, type Doc } from '@hcengineering/core'
import { type Plugin, plugin } from '@hcengineering/platform'
import { ExportTask } from './types'

export const exportId = 'export' as Plugin

export const exportPlugin = plugin(exportId, {
  class: {
    ExportTask: '' as Ref<Class<ExportTask>>
  }
//   component: {
//     ExportDialog: '' as AnyComponent
//   },
//   function: {
//     CanExport: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>
//   }
})

export default exportPlugin 