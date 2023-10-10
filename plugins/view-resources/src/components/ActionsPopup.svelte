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
  import { WithLookup, Doc, Ref } from '@hcengineering/core'
  import { getResource, translate } from '@hcengineering/platform'
  import { createQuery, getClient, ActionContext } from '@hcengineering/presentation'
  import ui, {
    Button,
    closePopup,
    Component,
    Icon,
    IconArrowLeft,
    Label,
    EditWithIcon,
    IconSearch,
    deviceOptionsStore,
    capitalizeFirstLetter,
    formatKey,
    themeStore
  } from '@hcengineering/ui'
  import { Action, ViewContext } from '@hcengineering/view'
  import { filterActions, getSelection } from '../actions'
  import view from '../plugin'
  import { focusStore, selectionStore } from '../selection'
  import { ListView, resizeObserver } from '@hcengineering/ui'
  import ObjectPresenter from './ObjectPresenter.svelte'
  import { tick } from 'svelte'
  import { createEventDispatcher } from 'svelte'

  export let viewContext: ViewContext

  let search: string = ''
  let actions: WithLookup<Action>[] = []
  let input: EditWithIcon

  const query = createQuery()

  query.query(
    view.class.Action,
    {
      // Disable popup actions for now
      // actionPopup: { $exists: false }
    },
    (res) => {
      actions = res
    },
    {
      lookup: {
        category: view.class.ActionCategory
      }
    }
  )

  let supportedActions: WithLookup<Action>[] = []
  let filteredActions: WithLookup<Action>[] = []

  async function filterVisibleActions (actions: WithLookup<Action>[], docs: Doc[]) {
    const resultActions: WithLookup<Action>[] = []

    for (const action of actions) {
      if (!action.visibilityTester) {
        resultActions.push(action)
      } else {
        const visibilityTester = await getResource(action.visibilityTester)

        if (await visibilityTester(docs)) {
          resultActions.push(action)
        }
      }
    }
    return resultActions
  }

  const client = getClient()

  async function getSupportedActions (actions: WithLookup<Action>[]) {
    const docs = getSelection($focusStore, $selectionStore)
    let fActions: WithLookup<Action>[] = actions

    for (const d of docs) {
      fActions = filterActions(client, d, fActions)
    }
    if (docs.length === 0) {
      fActions = fActions.filter((it) => it.input === 'none')
      const overrideRemove: Array<Ref<Action>> = []
      for (const fAction of fActions) {
        if (fAction.override !== undefined) {
          overrideRemove.push(...fAction.override)
        }
      }
      fActions = fActions.filter((it) => !overrideRemove.includes(it._id))
    }
    fActions = fActions.filter(
      (it) =>
        (it.$lookup?.category?.visible ?? true) &&
        (it.context.application === viewContext.application || it.context.application === undefined)
    )
    fActions = await filterVisibleActions(fActions, docs)
    // Sort by category.
    supportedActions = fActions.sort((a, b) => a.category.localeCompare(b.category))
  }

  $: getSupportedActions(actions)

  async function filterSearchActions (actions: WithLookup<Action>[], search: string): Promise<void> {
    const res: WithLookup<Action>[] = []
    search = search.trim().toLowerCase()
    if (search.length > 0) {
      for (const a of actions) {
        const tr = await translate(a.label, {}, $themeStore.language)
        if (tr.toLowerCase().indexOf(search) !== -1) {
          res.push(a)
        }
      }
      filteredActions = res
    } else {
      filteredActions = actions
    }
  }
  $: filterSearchActions(supportedActions, search)

  let selection = 0
  let list: ListView
  /* eslint-disable no-undef */

  let activeAction: Action | undefined

  async function handleSelection (evt: Event, selection: number): Promise<void> {
    const action = filteredActions[selection]
    if (action.actionPopup !== undefined) {
      activeAction = action
      return
    }
    const docs = getSelection($focusStore, $selectionStore)
    if (action.input === 'focus') {
      const impl = await getResource(action.action)
      if (impl !== undefined) {
        closePopup()
        impl(docs[0], evt, { ...action.actionProps, action })
      }
    }
    if (action.input === 'selection' || action.input === 'any' || action.input === 'none') {
      const impl = await getResource(action.action)
      if (impl !== undefined) {
        closePopup()
        impl(docs, evt, { ...action.actionProps, action })
      }
    }
  }

  function onKeydown (key: KeyboardEvent): void {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection - 1)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      handleSelection(key, selection)
    }
  }

  const dispatch = createEventDispatcher()
</script>

<ActionContext
  context={{
    mode: 'none'
  }}
/>

<div
  class="selectPopup width-40"
  style:width="15rem"
  on:keydown={onKeydown}
  use:resizeObserver={() => dispatch('changeContent')}
>
  {#if $selectionStore.length > 0 || $focusStore.focus !== undefined || (activeAction && activeAction?.actionPopup !== undefined)}
    <div class="mt-2 ml-2 flex-between flex-no-shrink">
      {#if $selectionStore.length > 0}
        <div class="item-box">
          <Label label={view.string.NumberItems} params={{ count: $selectionStore.length }} />
        </div>
      {:else if $focusStore.focus !== undefined}
        <div class="item-box">
          <ObjectPresenter
            objectId={$focusStore.focus._id}
            _class={$focusStore.focus._class}
            value={$focusStore.focus}
            disabled
          />
        </div>
      {/if}
      {#if activeAction && activeAction?.actionPopup !== undefined}
        <div class="mr-2">
          <Button
            icon={IconArrowLeft}
            label={ui.string.Back}
            kind={'ghost'}
            size={'small'}
            on:click={() => {
              activeAction = undefined
            }}
            width={'fit-content'}
          />
        </div>
      {/if}
    </div>
  {/if}
  {#if activeAction && activeAction?.actionPopup !== undefined}
    <Component
      is={activeAction?.actionPopup}
      props={{
        ...activeAction.actionProps,
        value: getSelection($focusStore, $selectionStore),
        width: 'full',
        size: 'medium',
        embedded: true
      }}
      on:close={async () => {
        activeAction = undefined
        await tick()
        input?.focus()
      }}
    />
  {:else}
    <div class="header">
      <EditWithIcon
        bind:this={input}
        icon={IconSearch}
        size={'large'}
        width={'100%'}
        autoFocus={!$deviceOptionsStore.isMobile}
        bind:value={search}
        placeholder={view.string.ActionPlaceholder}
      />
    </div>
    <div class="scroll">
      <div class="box">
        <ListView
          bind:this={list}
          count={filteredActions.length}
          bind:selection
          on:click={(evt) => handleSelection(evt, evt.detail)}
        >
          <svelte:fragment slot="category" let:item>
            {@const action = filteredActions[item]}
            {#if item === 0 || (item > 0 && filteredActions[item - 1].$lookup?.category?.label !== action.$lookup?.category?.label)}
              <!--Category for first item-->
              {#if action.$lookup?.category}
                <div class="category-box">
                  <Label label={action.$lookup.category.label} />
                </div>
              {/if}
            {/if}
          </svelte:fragment>
          <svelte:fragment slot="item" let:item>
            {@const action = filteredActions[item]}
            <div class="flex-row-center flex-between flex-grow ml-2 p-3 text-base cursor-pointer">
              <div class="mr-4 {selection === item ? 'caption-color' : 'content-dark-color'}">
                <Icon icon={action.icon ?? IconArrowLeft} size={'small'} />
              </div>
              <div class="flex-grow {selection === item ? 'caption-color' : 'content-color'}">
                <Label label={action.label} />
              </div>
              <div class="mr-2 text-md flex-row-center">
                {#if action.keyBinding}
                  {#each action.keyBinding as key, i}
                    {#if i !== 0}
                      <div class="ml-2 mr-2 lower"><Label label={view.string.Or} /></div>
                    {/if}
                    <div class="flex-row-center">
                      {#each formatKey(key) as k, jj}
                        {#if jj !== 0}
                          <div class="ml-1 mr-1 lower"><Label label={view.string.Then} /></div>
                        {/if}
                        {#each k as kk, j}
                          <div class="flex-center text-sm key-box">
                            {capitalizeFirstLetter(kk.trim())}
                          </div>
                        {/each}
                      {/each}
                    </div>
                  {/each}
                {/if}
              </div>
            </div>
          </svelte:fragment>
        </ListView>
      </div>
    </div>
  {/if}
  <div class="menu-space" />
</div>

<style lang="scss">
  .key-box {
    padding: 0 0.5rem;
    min-width: 1.5rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
  }
  .key-box + .key-box {
    margin-left: 0.5rem;
  }
  .item-box {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-divider-color);
    border-radius: 0.25rem;
  }
  .category-box {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    min-height: 2rem;
    text-transform: uppercase;
    font-weight: 500;
    font-size: 0.625rem;
    color: var(--theme-caption-color);
  }
</style>
