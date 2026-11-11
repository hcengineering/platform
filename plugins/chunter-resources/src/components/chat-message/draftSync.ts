//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { type Markup } from '@hcengineering/core'
import { areEqualMarkups } from '@hcengineering/text'

export interface DraftContent {
  message: Markup
  attachments?: number
}

function sameContent (a: DraftContent, b: DraftContent): boolean {
  return areEqualMarkups(a.message, b.message) && (a.attachments ?? 0) === (b.attachments ?? 0)
}

/**
 * An input's shared draft was sent from another input showing the same draft.
 * Decide whether this input still holds something the user has not sent.
 *
 * Only content changed in this input since it loaded the draft counts as unsent:
 * a copy that was never edited here is stale and is dropped, even when the sent
 * message differs from it (it was edited further in the other input).
 *
 * @param current - what this input shows now
 * @param loaded - what this input showed when it loaded the draft (or was last cleared)
 * @param sent - the message that was created
 */
export function keepsUnsentDraft (current: DraftContent, loaded: DraftContent, sent: DraftContent): boolean {
  return !sameContent(current, sent) && !sameContent(current, loaded)
}
