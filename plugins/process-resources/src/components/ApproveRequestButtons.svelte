<!--
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
-->
<script lang="ts">
  import { Card } from '@hcengineering/card'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { ApproveRequest } from '@hcengineering/process'
  import { Button, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import SignatureDialog from './SignatureDialog.svelte'
  import process from '../plugin'

  export let todo: ApproveRequest
  export let card: Ref<Card>

  const client = getClient()

  async function changeApprovalRequestState (ev: MouseEvent, isRejection: boolean): Promise<void> {
    showPopup(SignatureDialog, { isRejection }, eventToHTMLElement(ev), async (res) => {
      if (!res) return

      const { rejectionNote } = res

      if (isRejection && rejectionNote == null) {
        return
      }

      await client.update(todo, {
        doneOn: new Date().getTime(),
        approved: !isRejection,
        reason: isRejection ? rejectionNote : undefined
      })
    })
  }
</script>

<Button
  label={todo.actionType === 'review' ? process.string.Review : process.string.Approve}
  kind="positive"
  on:click={(ev) => changeApprovalRequestState(ev, false)}
/>
<Button label={process.string.Reject} kind="negative" on:click={(ev) => changeApprovalRequestState(ev, true)} />
