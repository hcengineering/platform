<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import chunter, { Comment } from '@hcengineering/chunter'
  import { updateBacklinks } from '@hcengineering/chunter-resources/src/backlinks'
  import contact, { EmployeeAccount } from '@hcengineering/contact'
  import { AttachedData, getCurrentAccount, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Request, RequestStatus } from '@hcengineering/request'
  import { Button } from '@hcengineering/ui'
  import request from '../plugin'

  export let value: Request

  let employee: EmployeeAccount | undefined

  const query = createQuery()
  const client = getClient()
  const me = getCurrentAccount()._id as Ref<EmployeeAccount>

  $: query.query(
    contact.class.EmployeeAccount,
    { _id: value.tx.modifiedBy as Ref<EmployeeAccount> },
    (account) => {
      ;[employee] = account
    },
    { limit: 1 }
  )

  const approvable = value.requested.includes(me) && !value.approved.includes(me)

  async function approve () {
    await saveComment()
    await client.update(value, {
      $push: {
        approved: me
      }
    })
  }

  $: disabled = commentIsEmpty(message, attachments)

  async function reject () {
    await saveComment()
    await client.update(value, {
      status: RequestStatus.Rejected
    })
  }

  let message: string = ''
  let attachments: number | undefined = 0

  async function onUpdate (event: CustomEvent<AttachedData<Comment>>) {
    message = event.detail.message
    attachments = event.detail.attachments
  }

  async function saveComment () {
    await client.addCollection(chunter.class.Comment, value.space, value._id, value._class, 'comments', {
      message,
      attachments
    })

    // We need to update backlinks before and after.
    await updateBacklinks(client, value.attachedTo, value.attachedToClass, value._id, message)
    refInput.submit()
  }

  function commentIsEmpty (message: string, attachments: number | undefined): boolean {
    return (message === '<p></p>' || message.trim().length === 0) && !((attachments ?? 0) > 0)
  }

  let refInput: AttachmentRefInput
</script>

{#if value.status === RequestStatus.Active}
  <div class="mt-2">
    <AttachmentRefInput
      bind:this={refInput}
      space={value.space}
      _class={value._class}
      objectId={value._id}
      showSend={false}
      on:update={onUpdate}
      placeholder={request.string.PleaseTypeMessage}
    />
  </div>
  <div class="mt-2 flex gap-2">
    <Button label={request.string.Comment} {disabled} on:click={saveComment} />
    {#if approvable}
      <Button label={request.string.Approve} {disabled} on:click={approve} />
      <Button label={request.string.Reject} {disabled} on:click={reject} />
    {/if}
  </div>
{/if}
