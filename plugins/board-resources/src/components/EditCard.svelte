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
  import chunter from '@anticrm/chunter'
  import { Class, Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import type { State } from '@anticrm/task'
  import task from '@anticrm/task'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { Button, Component, EditBox, Icon, IconActivity, IconClose, Label, Scroller } from '@anticrm/ui'
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
  let isActivityShown: boolean = true

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
      client.updateDoc(object._class, object.space, object._id, { [field]: value })
    }
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'number', 'title'] })
  })
</script>

{#if object !== undefined}
  <Scroller>
    <div class="root">
      <!-- TODO cover -->
      <div class="close-button">
        <Button icon={IconClose} kind="transparent" size="large" on:click={() => dispatch('close')} />
      </div>
      <div class="row">
        <div class="first-column">
          <Icon icon={board.icon.Card} size="large" />
        </div>
        <div class="title">
          <EditBox bind:value={object.title} maxWidth="39rem" focus on:change={() => change('title', object?.title)} />
        </div>
      </div>
      <div class="row">
        <div class="first-column" />
        <div>
          <Label label={board.string.InList} /><span class="state-name">{state?.title}</span>
        </div>
      </div>
      <div class="card-info">
        <div class="left-pane">
          <div class="row">
            <div class="first-column" />
            <CardFields value={object} />
          </div>
          <div class="row section-header">
            <div class="first-column">
              <Icon icon={board.icon.Card} size="large" />
            </div>
            <div class="section-label">
              <Label label={board.string.Description} />
            </div>
          </div>
          <div class="row">
            <div class="first-column" />
            <div class="description">
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
          <div class="row section-header">
            <div class="first-column">
              <Icon icon={IconActivity} size="large" />
            </div>
            <div class="section-label">
              <Label label={activity.string.Activity} />
            </div>
            <Button
              kind="no-border"
              label={isActivityShown ? board.string.HideDetails : board.string.ShowDetails}
              width="100px"
              on:click={() => {
                isActivityShown = !isActivityShown
              }}
            />
          </div>
          <div class="row">
            <div class="first-column" />
            <div class="comment-input">
              <Component is={chunter.component.CommentInput} props={{ object }} />
            </div>
          </div>
          {#if isActivityShown === true}
            <Component is={activity.component.Activity} props={{ object, noCommentInput: true, transparent: true }}>
              <slot />
            </Component>
          {/if}
        </div>

        <div class="right-pane"><CardActions value={object} /></div>
      </div>
    </div>
  </Scroller>
{/if}

<style lang="scss">
  .root {
    display: flex;
    justify-content: start;
    flex-direction: column;
    padding: 20px;
    width: 650px;
    height: 100%;
  }
  .close-button {
    position: absolute;
    top: 10px;
    right: 10px;
  }
  .title {
    font-size: 20px;
    font-weight: 600;
  }
  .card-info {
    padding-top: 10px;
  }
  .description {
    height: 70px;
    width: 100%;
    padding: 10px;
    border: 1px solid var(--theme-menu-divider);
    border-radius: 8px;
  }
  .first-column {
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
    padding-left: 20px;
  }
  .row {
    display: flex;
    justify-content: start;
    align-items: center;
    flex-direction: row;
  }
  .section-header {
    margin-top: 20px;
    margin-bottom: 5px;
  }
  .section-label {
    flex: 1;
    font-size: 16px;
    font-weight: 600;
  }
  .comment-input {
    width: 100%;
  }
  .state-name {
    padding-left: 5px;
    text-decoration: underline;

    &:hover {
      color: var(--caption-color);
    }
  }
</style>
