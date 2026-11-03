//
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { MessageBox } from '@hcengineering/presentation'
import type { IntlString } from '@hcengineering/platform'
import { showPopup } from '@hcengineering/ui'
import view, { tableSourceErrorMessage } from '@hcengineering/view'

/** Explain why a table operation stopped. */
export function showTableMessage (message: IntlString, params: Record<string, string | number> = {}): void {
  showPopup(MessageBox, { label: view.string.TraceXTableTitle, message, params, canSubmit: false }, 'center')
}

/** Show the specific reason a table source failed (deleted view, no access, too many rows, ...). */
export function showTableError (error?: unknown): void {
  const { label, params } = tableSourceErrorMessage(error)
  showTableMessage(label, params)
}
