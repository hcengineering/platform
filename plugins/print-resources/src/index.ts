//
// Copyright © 2024 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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

import { type Doc } from '@hcengineering/core'
import { type Resources } from '@hcengineering/platform'
import { showPopup } from '@hcengineering/ui'
import { getPrintBaseURL } from '@hcengineering/print'

import PrintToPDF from './components/PrintToPDF.svelte'
import PrintApp from './components/PrintApp.svelte'
import PrintBulkToPDF from './components/PrintBulkToPDF.svelte'
import DOCXViewer from './components/DOCXViewer.svelte'

export async function print (
  object: Doc | Doc[],
  evt: Event,
  props: {
    signed: boolean
  }
): Promise<void> {
  const signed = props?.signed ?? false
  const docs = Array.isArray(object) ? object : [object]

  if (docs.length === 0) {
    return
  }
  if (docs.length === 1) {
    showPopup(
      PrintToPDF,
      {
        object: docs[0],
        signed
      },
      'float'
    )
    return
  }
  showPopup(
    PrintBulkToPDF,
    {
      objects: docs,
      signed
    },
    'float'
  )
}

export async function canPrint (): Promise<boolean> {
  let printURL = ''
  try {
    printURL = getPrintBaseURL()
  } catch (err) {
    // do nothing
  }

  return printURL?.length > 0
}

export default async (): Promise<Resources> => ({
  component: {
    PrintApp,
    PrintToPDF,
    PrintBulkToPDF,
    DOCXViewer
  },
  actionImpl: {
    Print: print
  },
  function: {
    CanPrint: canPrint,
    CanConvert: canPrint
  }
})
