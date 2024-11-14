//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import type { Attachment } from '@hcengineering/attachment'
import type { Tx, TxRemoveDoc } from '@hcengineering/core'
import type { TriggerControl } from '@hcengineering/server-core'

/**
 * @public
 */
export async function OnAttachmentDelete (
  txes: Tx[],
  { removedMap, ctx, storageAdapter, workspace }: TriggerControl
): Promise<Tx[]> {
  const toDelete: string[] = []
  for (const tx of txes) {
    const rmTx = tx as TxRemoveDoc<Attachment>

    // Obtain document being deleted.
    const attach = removedMap.get(rmTx.objectId) as Attachment

    if (attach === undefined) {
      continue
    }
    toDelete.push(attach.file)
  }
  if (toDelete.length > 0) {
    await storageAdapter.remove(ctx, workspace, toDelete)
  }

  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnAttachmentDelete
  }
})
