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
  import type { Card } from '@anticrm/board'
  import { Class, Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import type { State } from '@anticrm/task'
  import task from '@anticrm/task'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { Button, EditBox, Icon, IconClose, Label, Scroller } from '@anticrm/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import board from '../plugin'
  import { updateCard } from '../utils/CardUtils'
  import CardActions from './editor/CardActions.svelte'
  import CardActivity from './editor/CardActivity.svelte'
  import CardFields from './editor/CardFields.svelte'

  export let _id: Ref<Card>
  export let _class: Ref<Class<Card>>
  const dispatch = createEventDispatcher()
  const client = getClient()
  const query = createQuery()

  let object: Card | undefined
  let state: State | undefined

  $: _id &&
    _class &&
    query.query(_class, { _id }, async (result) => {
      object = result[0]
    })

  $: object &&
    query.query(task.class.State, { _id: object.state }, async (result) => {
      state = result[0]
    })

  function change (field: string, value: any) {
    if (object) {
      updateCard(client, object, field, value)
    }
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'number', 'title'] })
  })
</script>

{#if object !== undefined}
  <Scroller>
    <div class="flex-col-stretch h-full w-165 p-6">
      <!-- TODO cover -->
      <div class="close-button">
        <Button icon={IconClose} kind="transparent" size="large" on:click={() => dispatch('close')} />
      </div>
      <div class="flex-row-streach">
        <div class="w-9">
          <Icon icon={board.icon.Card} size="large" />
        </div>
        <div class="fs-title text-lg">
          <EditBox bind:value={object.title} maxWidth="39rem" focus on:change={() => change('title', object?.title)} />
        </div>
      </div>
      <div class="flex-row-streach">
        <div class="w-9" />
        <div>
          <Label label={board.string.InList} /><span class="state-name ml-1">{state?.title}</span>
        </div>
      </div>
      <div class="flex-row-streach">
        <div class="flex-grow mr-4">
          <div class="flex-row-streach">
            <div class="w-9" />
            <CardFields value={object} />
          </div>
          <div class="flex-row-streach mt-4 mb-2">
            <div class="w-9">
              <Icon icon={board.icon.Card} size="large" />
            </div>
            <div class="fs-title">
              <Label label={board.string.Description} />
            </div>
          </div>
          <div class="flex-row-streach">
            <div class="w-9" />
            <div class="background-bg-accent border-bg-accent border-radius-3 p-2 w-full">
              <StyledTextBox
                alwaysEdit={true}
                showButtons={false}
                placeholder={board.string.DescriptionPlaceholder}
                bind:content={object.description}
                on:value={(evt) => change('description', evt.detail)}
              />
            </div>
          </div>
          <!-- TODO attachments-->
          <!-- TODO checklists -->
          <CardActivity value={object} />
        </div>

        <CardActions value={object} />
      </div>
    </div>
  </Scroller>
{/if}

<style lang="scss">
  .close-button {
    position: absolute;
    top: 0.7rem;
    right: 0.7rem;
  }
  .state-name {
    text-decoration: underline;

    &:hover {
      color: var(--caption-color);
    }
  }
</style>
