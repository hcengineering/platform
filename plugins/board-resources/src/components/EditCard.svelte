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
  import { getResource } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import type { State } from '@anticrm/task'
  import task from '@anticrm/task'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { EditBox, Icon, Label, Panel, Scroller } from '@anticrm/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  import board from '../plugin'
  import { getCardActions } from '../utils/CardActionUtils'
  import { updateCard } from '../utils/CardUtils'
  import CardActions from './editor/CardActions.svelte'
  import CardActivity from './editor/CardActivity.svelte'
  import CardAttachments from './editor/CardAttachments.svelte'
  import CardDetails from './editor/CardDetails.svelte'

  export let _id: Ref<Card>
  export let _class: Ref<Class<Card>>
  const dispatch = createEventDispatcher()
  const client = getClient()
  const cardQuery = createQuery()
  const stateQuery = createQuery()

  let object: Card | undefined
  let state: State | undefined
  let handleMove: () => void

  $: cardQuery.query(_class, { _id }, async (result) => {
      object = result[0]
    })

  $: object?.state && stateQuery.query(task.class.State, { _id: object.state }, async (result) => {
      state = result[0]
    })

  getCardActions(client, { _id: board.cardAction.Move }).then(async (result) => {
    if (result[0]?.handler) {
      const handler = await getResource(result[0].handler)
      handleMove = () => {
        if (object) {
          handler(object, client)
        }
      }
    }
  })

  function change(field: string, value: any) {
    if (object) {
      updateCard(client, object, field, value)
    }
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'number', 'title'] })
  })
</script>

{#if object !== undefined}
  <Panel showHeader={false} on:close={() => dispatch('close')}>
    <Scroller>
      <div class="flex-col-stretch h-full w-165 p-6">
        <!-- TODO cover -->
        <div class="flex-row-streach">
          <div class="w-9">
            <Icon icon={board.icon.Card} size="large" />
          </div>
          <div class="fs-title text-lg">
            <EditBox
              bind:value={object.title}
              maxWidth="39rem"
              focus
              on:change={() => change('title', object?.title)}
            />
          </div>
        </div>
        <div class="flex-row-streach">
          <div class="w-9" />
          <div>
            <Label label={board.string.InList} />
            <span class="state-name ml-1" on:click={handleMove}>{state?.title}</span>
          </div>
        </div>
        <div class="flex-row-streach">
          <div class="flex-grow mr-4">
            <div class="flex-row-streach">
              <div class="w-9" />
              <CardDetails bind:value={object} />
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
            <CardAttachments value={object} />
            <!-- TODO checklists -->
            <CardActivity bind:value={object} />
          </div>

          <CardActions bind:value={object} />
        </div>
      </div>
    </Scroller>
  </Panel>
{/if}

<style lang="scss">
  .state-name {
    text-decoration: underline;

    &:hover {
      color: var(--caption-color);
    }
  }
</style>
