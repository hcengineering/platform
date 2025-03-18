//
// Copyright © 2024 Hardcore Engineering Inc.
//

import { type IntlString, type Metadata, type Plugin, plugin, type Asset } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'

export const exportId = 'export' as Plugin

export const exportPlugin = plugin(exportId, {
  string: {
    Export: '' as IntlString // todo: add more export strings
  },
  component: {
    ExportButton: '' as AnyComponent
  },
  icon: {
    Export: '' as Asset
  },
  metadata: {
    ExportURL: '' as Metadata<string>
  }
})

export default exportPlugin
