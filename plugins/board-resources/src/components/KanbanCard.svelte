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
  import type { Card, CardDate } from '@anticrm/board'
  import { CommentsPresenter } from '@anticrm/chunter-resources'
  import contact, { Employee } from '@anticrm/contact'
  import type { Ref, WithLookup } from '@anticrm/core'
  import notification from '@anticrm/notification'
  import view from '@anticrm/view'
  import { getClient, UserBoxList } from '@anticrm/presentation'
  import { Button, Component, EditBox, Icon, IconEdit, Label, numberToHexColor, showPopup } from '@anticrm/ui'
  import { ContextMenu } from '@anticrm/view-resources'
  import board from '../plugin'
  import CardLabels from './editor/CardLabels.svelte'
  import DatePresenter from './presenters/DatePresenter.svelte'
  import { hasDate, openCardPanel, updateCard, updateCardMembers } from '../utils/CardUtils'
  import { getElementPopupAlignment } from '../utils/PopupUtils'
  import CheckListsPresenter from './presenters/ChecklistsPresenter.svelte'
  import NotificationPresenter from './presenters/NotificationPresenter.svelte'

  export let object: WithLookup<Card>

  let loadingAttachment = 0
  let dragoverAttachment = false
  let ref: HTMLElement

  const client = getClient()
  let isEditMode = false

  function exitEditMode (): void {
    isEditMode = false
  }

  function enterEditMode (): void {
    isEditMode = true
    showPopup(ContextMenu, { object }, getElementPopupAlignment(ref, { h: 'right', v: 'top' }), exitEditMode)
  }

  function showCard () {
    openCardPanel(object)
  }

  function canDropAttachment (e: DragEvent): boolean {
    return !!e.dataTransfer?.items && e.dataTransfer?.items.length > 0
  }

  function updateMembers (e: CustomEvent<Ref<Employee>[]>) {
    updateCardMembers(object, client, e.detail)
  }

  function updateDate (e: CustomEvent<CardDate>) {
    client.update(object, { date: e.detail })
  }
  $: coverBackground = object.cover?.color ? `background-color: ${numberToHexColor(object.cover.color)}` : ''
</script>

<AttachmentDroppable
  bind:loading={loadingAttachment}
  bind:dragover={dragoverAttachment}
  objectClass={object._class}
  objectId={object._id}
  space={object.space}
  canDrop={canDropAttachment}
>
  {#if object.cover?.size === 'large'}
    <div class="relative flex-col pt-2 pb-1 pr-2 pl-2 border-radius-1" style={coverBackground} bind:this={ref}>
      {#if dragoverAttachment}
        <div style:pointer-events="none" class="abs-full-content h-full w-full flex-center fs-title">
          <Label label={board.string.DropFileToUpload} />
        </div>
        <div
          style:opacity="0.3"
          style:pointer-events="none"
          class="abs-full-content background-theme-content-accent h-full w-full flex-center fs-title"
        />
      {/if}
      <div class="ml-1">
        <CardLabels bind:value={object} isInline={true} />
      </div>
      {#if !isEditMode}
        <div class="absolute mr-1 mt-1" style:top="0" style:right="0">
          <Button icon={IconEdit} kind="transparent" on:click={enterEditMode} />
        </div>
      {/if}
      <div
        class="flex-between pb-2 ml-1"
        style:pointer-events={dragoverAttachment ? 'none' : 'all'}
        on:click={showCard}
      >
        <div class="mt-6 mb-2">
          {#if isEditMode}
            <div class="fs-title text-lg">
              <EditBox
                bind:value={object.title}
                maxWidth="39rem"
                focus
                on:change={() => updateCard(client, object, 'title', object?.title)}
              />
            </div>
          {:else}
            <div class="flex-row-center w-full">
              <div class="fs-title text-lg cursor-pointer">{object.title}</div>
              <div class="ml-2">
                <Component is={notification.component.NotificationPresenter} props={{ value: object }} />
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    {#if object.cover}
      <div class="relative h-9 border-radius-top-1" style={coverBackground}>
        <div class="absolute mr-1 mt-1" style:top="0" style:right="0">
          <Button icon={IconEdit} kind="transparent" on:click={enterEditMode} />
        </div>
      </div>
    {/if}
    <div class="relative flex-col pt-2 pb-1 pr-2 pl-2" bind:this={ref}>
      {#if dragoverAttachment}
        <div style:pointer-events="none" class="abs-full-content h-full w-full flex-center fs-title">
          <Label label={board.string.DropFileToUpload} />
        </div>
        <div
          style:opacity="0.3"
          style:pointer-events="none"
          class="abs-full-content background-theme-content-accent h-full w-full flex-center fs-title"
        />
      {/if}
      <div class="ml-1">
        <CardLabels bind:value={object} isInline={true} />
      </div>
      {#if !isEditMode && !object.cover}
        <div class="absolute mr-1 mt-1" style:top="0" style:right="0">
          <Button icon={IconEdit} kind="transparent" on:click={enterEditMode} />
        </div>
      {/if}
      <div
        class="flex-between pb-2 ml-1"
        style:pointer-events={dragoverAttachment ? 'none' : 'all'}
        on:click={showCard}
      >
        {#if isEditMode}
          <div class="fs-title text-lg">
            <EditBox
              bind:value={object.title}
              maxWidth="39rem"
              focus
              on:change={() => updateCard(client, object, 'title', object?.title)}
            />
          </div>
        {:else}
          <div class="flex-row-center w-full">
            <div class="fs-title cursor-pointer">{object.title}</div>
            <div class="ml-2">
              <Component is={notification.component.NotificationPresenter} props={{ value: object }} />
            </div>
          </div>
        {/if}
      </div>
      <div class="flex-between mb-1" style:pointer-events={dragoverAttachment ? 'none' : 'all'}>
        <div class="float-left-box">
          <!-- TODO: adjust icons -->
          <div class="float-left">
            <NotificationPresenter {object} />
          </div>
          {#if object.date && hasDate(object)}
            <div class="float-left">
              <DatePresenter value={object.date} size="x-small" on:update={updateDate} />
            </div>
          {/if}
          {#if object.description}
            <div class="float-left">
              <div class="sm-tool-icon ml-1 mr-1">
                <span class="icon"><Icon icon={view.icon.Table} size="small" /></span>
              </div>
            </div>
          {/if}
          {#if (object.attachments ?? 0) > 0}
            <div class="float-left">
              <AttachmentsPresenter value={object.attachments} {object} size="small" />
            </div>
          {/if}
          {#if (object.comments ?? 0) > 0}
            <div class="float-left">
              <CommentsPresenter value={object.comments} {object} />
            </div>
          {/if}
          {#if (object.todoItems ?? 0) > 0}
            <div class="float-left">
              <CheckListsPresenter value={object} />
            </div>
          {/if}
        </div>
      </div>
      {#if (object.members?.length ?? 0) > 0}
        <div class="flex justify-end mt-1 mb-2" style:pointer-events={dragoverAttachment ? 'none' : 'all'}>
          <UserBoxList
            _class={contact.class.Employee}
            items={object.members}
            label={board.string.Members}
            on:update={updateMembers}
          />
        </div>
      {/if}
    </div>
  {/if}
</AttachmentDroppable>
