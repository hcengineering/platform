<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import attachment, { Attachment } from '@anticrm/attachment'
  import type { Card } from '@anticrm/board'
  import { getClient } from '@anticrm/presentation'
  import { Button, Icon, IconAdd, IconAttachment, Label, showPopup } from '@anticrm/ui'
  import AttachmentPicker from '../popups/AttachmentPicker.svelte'
  import AttachmentPresenter from '../presenters/AttachmentPresenter.svelte'
  import board from '../../plugin'
  import { getPopupAlignment } from '../../utils/PopupUtils'

  export let value: Card
  const client = getClient()
  let attachments: Attachment[] = []

  async function fetch () {
    attachments = await client.findAll(attachment.class.Attachment, { space: value.space, attachedTo: value._id })
  }

  function addAttachment (e: Event) {
    showPopup(AttachmentPicker, { value }, getPopupAlignment(e))
  }

  $: value?.attachments && value.attachments > 0 && fetch()
</script>

{#if value !== undefined}
  {#if value.attachments !== undefined && value.attachments > 0}
    <div class="flex-col w-full">
      <div class="flex-row-stretch mt-4 mb-2">
        <div class="w-9">
          <Icon icon={IconAttachment} size="large" />
        </div>
        <div class="flex-grow fs-title">
          <Label label={board.string.Attachments} />
        </div>
      </div>
      <div class="flex-row-stretch">
        <div class="w-9" />
        <div class="flex-col flex-gap-1 w-full">
          {#each attachments as attach}
            <AttachmentPresenter value={attach} />
          {/each}
          <div class="mt-2">
            <Button icon={IconAdd} label={board.string.Attachments} kind="no-border" on:click={addAttachment} />
          </div>
        </div>
      </div>
    </div>
  {:else}
    <Button icon={IconAdd} label={board.string.Attachments} kind="no-border" on:click={addAttachment} />
  {/if}
{/if}
