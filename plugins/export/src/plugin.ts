//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type IntlString, type Metadata, type Plugin, plugin, type Asset } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'

export const exportId = 'export' as Plugin

export const exportPlugin = plugin(exportId, {
  string: {
    Export: '' as IntlString, // todo: remove?
    ExportCompleted: '' as IntlString,
    ExportFailed: '' as IntlString
  },
  component: {
    ExportButton: '' as AnyComponent,
    ExportSettings: '' as AnyComponent
  },
  icon: {
    Export: '' as Asset
  },
  metadata: {
    ExportUrl: '' as Metadata<string>
  }
})

export default exportPlugin
