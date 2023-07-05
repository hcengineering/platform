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
  import { AttachmentDroppable, AttachmentsPresenter } from '@hcengineering/attachment-resources'
  import type { Card } from '@hcengineering/board'
  import { CommentsPresenter } from '@hcengineering/chunter-resources'
  import { Employee } from '@hcengineering/contact'
  import type { Ref, WithLookup } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import view from '@hcengineering/view'
  import tags from '@hcengineering/tags'
  import { getClient } from '@hcengineering/presentation'
  import contact from '@hcengineering/contact'
  import {
    Button,
    Component,
    EditBox,
    getPopupPositionElement,
    Icon,
    IconMoreV,
    Label,
    numberToHexColor,
    showPopup
  } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'
  import board from '../plugin'
  import DatePresenter from './presenters/DatePresenter.svelte'
  import { hasDate, openCardPanel, updateCard, updateCardMembers } from '../utils/CardUtils'
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
    showPopup(ContextMenu, { object }, getPopupPositionElement(ref, { h: 'right', v: 'top' }), exitEditMode)
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
          class="abs-full-content background-content-accent-color h-full w-full flex-center fs-title"
        />
      {/if}
      {#if !isEditMode}
        <div class="absolute mr-1 mt-1" style:top="0" style:right="0">
          <Button icon={IconMoreV} kind="ghost" on:click={enterEditMode} />
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
                autoFocus
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
          <Button icon={IconMoreV} kind="ghost" on:click={enterEditMode} />
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
          class="abs-full-content background-content-accent-color h-full w-full flex-center fs-title"
        />
      {/if}
      {#if !isEditMode && !object.cover}
        <div class="absolute mr-1 mt-1" style:top="0" style:right="0">
          <Button icon={IconMoreV} kind="ghost" on:click={enterEditMode} />
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
              autoFocus
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
          {#if hasDate(object)}
            <div class="float-left">
              <DatePresenter value={object} size="x-small" />
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
          {#if (object.labels ?? 0) > 0}
            <div class="float-left">
              <Component
                is={tags.component.TagsPresenter}
                props={{ value: object, _class: object._class, key: 'labels' }}
              />
            </div>
          {/if}
        </div>
      </div>
      {#if (object.members?.length ?? 0) > 0}
        <div class="flex justify-end mt-1 mb-2" style:pointer-events={dragoverAttachment ? 'none' : 'all'}>
          <Component
            is={contact.component.UserBoxList}
            props={{ items: object.members, label: board.string.Members }}
            on:update={updateMembers}
          />
        </div>
      {/if}
    </div>
  {/if}
</AttachmentDroppable>
