//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { type Attribute } from '@tiptap/core'
import { showPopup, SelectPopup, type PopupAlignment } from '@hcengineering/ui'

import { mInsertTable } from './components/extensions'

export function getDataAttribute (
  name: string,
  options?: Omit<Attribute, 'parseHTML' | 'renderHTML'>
): Partial<Attribute> {
  const dataName = `data-${name}`

  return {
    default: null,
    parseHTML: (element) => element.getAttribute(dataName),
    renderHTML: (attributes) => {
      // eslint-disable-next-line
      if (!attributes[name]) {
        return {}
      }

      return {
        [dataName]: attributes[name]
      }
    },
    ...(options ?? {})
  }
}

export async function addTableHandler (
  insertTable: (options: { rows?: number, cols?: number, withHeaderRow?: boolean }) => void,
  alignment?: PopupAlignment
): Promise<void> {
  showPopup(
    SelectPopup,
    {
      value: mInsertTable.map((it) => ({ id: it.label, text: it.label }))
    },
    alignment ?? 'center',
    (val) => {
      if (val !== undefined) {
        const tab = mInsertTable.find((it) => it.label === val)
        if (tab !== undefined) {
          insertTable({
            cols: tab.cols,
            rows: tab.rows,
            withHeaderRow: tab.header
          })
        }
      }
    }
  )
}
