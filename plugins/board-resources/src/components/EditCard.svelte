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
  import activity from '@anticrm/activity'
  import type { Card } from '@anticrm/board'
  import { Class, Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import type { State } from '@anticrm/task'
  import task from '@anticrm/task'
  import { Component, EditBox, Icon, Label } from '@anticrm/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import board from '../plugin'
  import CardActions from './CardActions.svelte'
  import CardFields from './CardFields.svelte'

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

  function close () {
    dispatch('close')
  }

  function change (field: string, value: any) {
    client.updateDoc(value._class, value.space, value._id, { [field]: value })
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'number', 'title'] })
  })
</script>

{#if object !== undefined}
  <div class="root">
    <!-- TODO cover -->
    <div class="row">
      <div class="first_column">
        <Icon icon={board.icon.Card} size="large" />
      </div>
      <div class="title">
        <EditBox bind:value={object.title} maxWidth="39rem" focus on:change={() => change('title', object?.title)} />
      </div>
    </div>
    <div class="row">
      <div class="first_column" />
      <div>
        <Label label={board.string.InList} /><span class="state-name">{state?.title}</span>
      </div>
    </div>
    <div class="card-info">
      <div class="left-pane">
        <div class="row">
          <div class="first_column" />
          <CardFields value={object} />
        </div>
        <div class="row">
          <div class="first_column">
            <Icon icon={board.icon.Card} size="large" />
          </div>
          <div class="description-label">
            <Label label={board.string.Description} />
          </div>
        </div>
        <div class="row">
          <div class="first_column" />
          <EditBox
            bind:value={object.description}
            maxWidth="39rem"
            focus
            on:change={() => change('description', object?.description)}
          />
        </div>
        <!-- TODO attachments-->
        <!-- TODO checklists -->
      </div>
      <div class="right-pane"><CardActions value={object} /></div>
    </div>
    <Component is={activity.component.Activity} props={{ object, transparent: true }}>
      <slot />
    </Component>
  </div>
{/if}

<style lang="scss">
  .root {
    display: flex;
    justify-content: center;
    flex-direction: column;
    padding: 20px;
    width: 650px;
    height: 100%;
  }
  .title {
    font-size: 20px;
    font-weight: 600;
  }
  .card-info {
    padding-top: 10px;
  }
  .description-label {
    font-size: 16px;
    font-weight: 600;
  }
  .first_column {
    width: 40px;
  }
  .card-info {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
  }
  .left-pane {
    flex: 1;
  }
  .right-pane {
    width: 160px;
  }
  .row {
    display: flex;
    justify-content: start;
    align-items: center;
    flex-direction: row;
  }
  .state-name {
    padding-left: 5px;

    &:hover {
      text-decoration: underline;
    }
  }
</style>
