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
  import { Attachments } from '@hcengineering/attachment-resources'
  import type { Card } from '@hcengineering/board'
  import core, { Class, Doc, Mixin, Ref, Space } from '@hcengineering/core'
  import { Panel } from '@hcengineering/panel'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import type { State, TodoItem } from '@hcengineering/task'
  import task from '@hcengineering/task'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import {
    Button,
    CircleButton,
    EditBox,
    getEventPopupPositionElement,
    IconAdd,
    IconMoreH,
    Label,
    showPopup
  } from '@hcengineering/ui'
  import {
    ContextMenu,
    DocAttributeBar,
    invokeAction,
    ParentsNavigator,
    UpDownNavigator
  } from '@hcengineering/view-resources'
  import { createEventDispatcher, onMount } from 'svelte'
  import board from '../plugin'
  import { getCardActions } from '../utils/CardActionUtils'
  import { updateCard } from '../utils/CardUtils'
  import CardActions from './editor/CardActions.svelte'
  import CardChecklist from './editor/CardChecklist.svelte'
  import AddChecklist from './popups/AddChecklist.svelte'

  export let _id: Ref<Card>
  export let _class: Ref<Class<Card>>
  const dispatch = createEventDispatcher()
  const client = getClient()
  const cardQuery = createQuery()
  const stateQuery = createQuery()
  const spaceQuery = createQuery()
  const checklistsQuery = createQuery()

  let object: Card | undefined
  let state: State | undefined
  let space: Space | undefined
  let handleMove: (e: Event) => void
  let checklists: TodoItem[] = []
  const mixins: Mixin<Doc>[] = []
  const allowedCollections = ['labels']
  const ignoreKeys = ['isArchived', 'location', 'title', 'description', 'status', 'number', 'assignee', 'doneState']

  function change (field: string, value: any) {
    if (object) {
      updateCard(client, object, field, value)
    }
  }

  function addChecklist (e: Event) {
    showPopup(AddChecklist, { value: object }, getEventPopupPositionElement(e))
  }

  $: cardQuery.query(_class, { _id }, (result) => {
    object = result[0]
  })

  $: object?.status &&
    stateQuery.query(task.class.State, { _id: object.status }, (result) => {
      state = result[0]
    })

  $: object?.space &&
    spaceQuery.query(core.class.Space, { _id: object.space }, (result) => {
      space = result[0]
    })

  $: object &&
    checklistsQuery.query(task.class.TodoItem, { space: object.space, attachedTo: object._id }, (result) => {
      checklists = result
    })

  getCardActions(client, { _id: board.action.Move }).then(async (result) => {
    if (result[0]) {
      handleMove = (e) => {
        if (!object) {
          return
        }
        invokeAction(object, e, result[0].action, result[0].actionProps)
      }
    }
  })

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'number', 'title'] })
  })
</script>

{#if object !== undefined}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <Panel
    icon={board.icon.Card}
    title={object?.title}
    {object}
    isHeader
    isAside={true}
    isSub={false}
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="navigator">
      <UpDownNavigator element={object} />
      <ParentsNavigator element={object} />
    </svelte:fragment>
    <svelte:fragment slot="header">
      <div class="flex fs-title flex-gap-1">
        <span class="over-underline" on:click={handleMove}>{space?.name}</span>><span
          class="over-underline"
          on:click={handleMove}>{state?.name}</span
        >
      </div>
    </svelte:fragment>
    <svelte:fragment slot="tools">
      <Button
        icon={IconMoreH}
        kind="ghost"
        size="medium"
        on:click={(e) => {
          showPopup(
            ContextMenu,
            { object, baseMenuClass: board.class.Card, mode: 'editor' },
            getEventPopupPositionElement(e)
          )
        }}
      />
    </svelte:fragment>
    <EditBox
      bind:value={object.title}
      kind={'large-style'}
      autoFocus
      on:change={() => change('title', object?.title)}
    />
    <div class="background-accent-bg-color border-divider-color border-radius-3 p-4 mt-4 w-full">
      <StyledTextBox
        alwaysEdit={true}
        showButtons={false}
        placeholder={board.string.DescriptionPlaceholder}
        bind:content={object.description}
        on:value={(evt) => change('description', evt.detail)}
      />
    </div>
    <div class="mt-6">
      <Attachments objectId={_id} {_class} space={object.space} attachments={object.attachments ?? 0} />
    </div>
    <div class="flex-row-center mt-6">
      <span class="text-xl font-medium caption-color mr-3"><Label label={board.string.Checklists} /></span>
      <CircleButton icon={IconAdd} size="small" selected on:click={addChecklist} />
    </div>
    <div class="mr-2 ml-2 mb-4">
      {#each checklists as checklist}
        <CardChecklist value={checklist} />
      {/each}
    </div>
    <svelte:fragment slot="custom-attributes" let:direction>
      {#if direction === 'column'}
        <DocAttributeBar {object} {mixins} {ignoreKeys} {allowedCollections} />
        <!-- TODO: adjust rest actions -->
        <CardActions bind:value={object} />
      {:else}
        <Button icon={board.icon.Card} label={board.string.Actions} kind={'no-border'} size={'small'} />
      {/if}
    </svelte:fragment>
  </Panel>
{/if}
