//
// Copyright © 2024 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
//
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

import { type Doc } from '@hcengineering/core'
import { type IntlString, type Metadata, type Plugin, plugin, type Asset, type Resource } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'

export const printId = 'print' as Plugin

export const print = plugin(printId, {
  string: {
    PrintToPDF: '' as IntlString,
    PrintingDocumentOf: '' as IntlString,
    DownloadAll: '' as IntlString,
    PrintFailed: '' as IntlString,
    PrintSettings: '' as IntlString,
    LandscapeMode: '' as IntlString
  },
  component: {
    PrintApp: '' as AnyComponent,
    PrintToPDF: '' as AnyComponent,
    PrintBulkToPDF: '' as AnyComponent,
    DOCXViewer: '' as AnyComponent
  },
  icon: {
    Print: '' as Asset
  },
  metadata: {
    PrintURL: '' as Metadata<string>
  },
  function: {
    CanPrint: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanConvert: '' as Resource<() => Promise<boolean>>
  }
})

export default print
