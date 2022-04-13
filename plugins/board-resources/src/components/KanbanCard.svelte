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
  import { AttachmentDroppable, AttachmentsPresenter } from '@anticrm/attachment-resources'
  import type { Card } from '@anticrm/board'
  import { CommentsPresenter } from '@anticrm/chunter-resources'
  import type { WithLookup } from '@anticrm/core'
  import notification from '@anticrm/notification'
  import { ActionIcon, Component, IconMoreH, Label, showPanel, showPopup } from '@anticrm/ui'
  import { ContextMenu } from '@anticrm/view-resources'
  import board from '../plugin'

  export let object: WithLookup<Card>
  export let dragged: boolean

  let loadingAttachment = 0
  let dragoverAttachment = false

  function showMenu (ev?: Event): void {
    showPopup(ContextMenu, { object }, (ev as MouseEvent).target as HTMLElement)
  }

  function showCard () {
    showPanel(board.component.EditCard, object._id, object._class, 'middle')
  }

  function canDropAttachment (e: DragEvent): boolean {
    return !!e.dataTransfer?.items && e.dataTransfer?.items.length > 0;
  }

</script>

<AttachmentDroppable
  bind:loading={loadingAttachment}
  bind:dragover={dragoverAttachment}
  objectClass={object._class}
  objectId={object._id}
  space={object.space}
  canDrop={canDropAttachment}>
  <div class="relative flex-col pt-2 pb-2 pr-4 pl-4">
    {#if dragoverAttachment}
      <div style:pointer-events="none" class="abs-full-content h-full w-full flex-center fs-title">
        <Label label={board.string.DropFileToUpload} />
      </div>
      <div
        style:opacity={0.3}
        style:pointer-events="none"
        class="abs-full-content background-theme-content-accent h-full w-full flex-center fs-title" />
    {/if}
    <div class="flex-between mb-4" style:pointer-events={dragoverAttachment ? 'none' : 'all'}>
      <div class="flex-col">
        <div class="fs-title cursor-pointer" on:click={showCard}>{object.title}</div>
      </div>
      <div class="flex-row-center">
        <div class="mr-2">
          <Component is={notification.component.NotificationPresenter} props={{ value: object }} />
        </div>
        <ActionIcon
          label={board.string.More}
          action={(evt) => {
            showMenu(evt)
          }}
          icon={IconMoreH}
          size="small" />
      </div>
    </div>
    <div class="flex-between" style:pointer-events={dragoverAttachment ? 'none' : 'all'}>
      <div class="flex-row-center">
        {#if (object.attachments ?? 0) > 0}
          <div class="step-lr75">
            <AttachmentsPresenter value={object} />
          </div>
        {/if}
        {#if (object.comments ?? 0) > 0}
          <div class="step-lr75">
            <CommentsPresenter value={object} />
          </div>
        {/if}
      </div>
    </div>
  </div>
</AttachmentDroppable>
