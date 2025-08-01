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

import { getObjectValue } from '@hcengineering/core'
import { getEmbeddedLabel } from '@hcengineering/platform'
import process, { Execution, SelectedContext, processError } from '@hcengineering/process'
import { ProcessControl } from '@hcengineering/server-process'

export function getAttributeValue (control: ProcessControl, execution: Execution, context: SelectedContext): any {
  const card = control.cache.get(execution.card)
  if (card === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card }, {}, true)
  const val = getObjectValue(context.key, card)
  if (val == null) {
    const attr = control.client.getHierarchy().findAttribute(card._class, context.key)
    throw processError(
      process.error.EmptyAttributeContextValue,
      {},
      { attr: attr?.label ?? getEmbeddedLabel(context.key) }
    )
  }
  return val
}
