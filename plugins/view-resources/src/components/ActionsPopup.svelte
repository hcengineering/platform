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
  import core, {
    Doc,
    Ref,
    SearchResultDoc,
    Tx,
    TxWorkspaceEvent,
    WithLookup,
    WorkspaceEvent
  } from '@hcengineering/core'
  import { getResource, translate, translateCB } from '@hcengineering/platform'
  import {
    ActionContext,
    SearchResult,
    addTxListener,
    createQuery,
    getClient,
    reduceCalls,
    removeTxListener,
    searchFor,
    type ObjectSearchCategory,
    type SearchItem
  } from '@hcengineering/presentation'
  import ui, {
    Button,
    Component,
    Icon,
    IconArrowLeft,
    Label,
    ListView,
    capitalizeFirstLetter,
    closePopup,
    deviceOptionsStore,
    formatKey,
    resizeObserver,
    themeStore
  } from '@hcengineering/ui'
  import { Action, ActionCategory, ViewContext } from '@hcengineering/view'
  import { createEventDispatcher, onMount, tick } from 'svelte'
  import { filterActions, getSelection } from '../actions'
  import view from '../plugin'
  import { focusStore, selectionStore } from '../selection'
  import { openDoc } from '../utils'
  import ObjectPresenter from './ObjectPresenter.svelte'

  import { contextStore } from '@hcengineering/presentation'
  import ChevronDown from './icons/ChevronDown.svelte'
  import ChevronUp from './icons/ChevronUp.svelte'

  export let viewContext: ViewContext | undefined = $contextStore.getLastContext()

  let search: string = ''
  let actions: Array<WithLookup<Action>> = []

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

  let supportedActions: Array<WithLookup<Action>> = []
  let filteredActions: Array<WithLookup<Action>> = []

  async function filterVisibleActions (
    actions: Array<WithLookup<Action>>,
    docs: Doc[]
  ): Promise<Array<WithLookup<Action>>> {
    const resultActions: Array<WithLookup<Action>> = []

    for (const action of actions) {
      if (action.visibilityTester === undefined) {
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

  const getSupportedActions = reduceCalls(async (actions: Array<WithLookup<Action>>): Promise<void> => {
    const docs = getSelection($focusStore, $selectionStore)
    let fActions: Array<WithLookup<Action>> = actions

    // We need to filter application based actions first, to prevent override for globals
    fActions = fActions.filter(
      (it) =>
        (it.$lookup?.category?.visible ?? true) &&
        (it.context.application === viewContext?.application || it.context.application === undefined)
    )
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
    fActions = await filterVisibleActions(fActions, docs)
    // Sort by category.
    supportedActions = fActions.sort((a, b) => a.category.localeCompare(b.category))
  })

  $: void getSupportedActions(actions)

  const filterSearchActions = reduceCalls(async (actions: Array<WithLookup<Action>>, search: string): Promise<void> => {
    const res: Array<WithLookup<Action>> = []
    let preparedSearch = search.trim().toLowerCase()
    if (preparedSearch.charAt(0) === '/') {
      preparedSearch = preparedSearch.substring(1)
    }
    if (preparedSearch.length > 0) {
      for (const a of actions) {
        const tr = await translate(a.label, {}, $themeStore.language)
        if (tr.toLowerCase().includes(preparedSearch)) {
          res.push(a)
        }
      }
      filteredActions = res
    } else {
      filteredActions = actions
    }
  })
  $: void filterSearchActions(supportedActions, search)

  let selection = 0
  let list: ListView
  /* eslint-disable no-undef */

  let activeAction: Action | undefined

  async function handleSelection (evt: Event, selection: number): Promise<void> {
    const item = items[selection]
    if (item == null) {
      return
    }
    if (item.item !== undefined) {
      const doc = item.item.doc
      void client.findOne(doc._class, { _id: doc._id }).then((value) => {
        if (value !== undefined) {
          void openDoc(client.getHierarchy(), value)
        }
      })
    } else if (item.action !== undefined) {
      const action = item.action
      if (action.actionPopup !== undefined) {
        activeAction = action
        return
      }
      const docs = getSelection($focusStore, $selectionStore)
      if (action.input === 'focus') {
        const impl = await getResource(action.action)
        if (impl !== undefined) {
          closePopup()
          void impl(docs[0], evt, { ...action.actionProps, action })
        }
      }
      if (action.input === 'selection' || action.input === 'any' || action.input === 'none') {
        const impl = await getResource(action.action)
        if (impl !== undefined) {
          closePopup()
          void impl(docs, evt, { ...action.actionProps, action })
        }
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
      void handleSelection(key, selection)
    }
  }

  const dispatch = createEventDispatcher()

  interface SearchActionItem {
    num: number
    item?: SearchResultDoc
    category?: ObjectSearchCategory
    action?: WithLookup<Action>
    actionCategory?: ActionCategory | WithLookup<ActionCategory>
  }

  function packSearchAndActions (
    searchItems: SearchItem[],
    filteredActions: Array<WithLookup<Action>>
  ): SearchActionItem[] {
    let iter = -1
    const mappedActions: SearchActionItem[] = filteredActions.map((action, num: number) => {
      if (num > 0 && filteredActions[num - 1].$lookup?.category?.label !== action.$lookup?.category?.label) {
        iter = 0
      } else {
        iter++
      }
      return {
        num: iter,
        action,
        actionCategory: action.$lookup?.category
      }
    })
    return ([] as SearchActionItem[]).concat(searchItems).concat(mappedActions)
  }

  let items: SearchActionItem[] = []

  const updateItems = reduceCalls(async (query: string, filteredActions: Array<WithLookup<Action>>): Promise<void> => {
    let searchItems: SearchItem[] = []
    if (query !== '' && query.indexOf('/') !== 0) {
      searchItems = (await searchFor('spotlight', query)).items
    }
    items = packSearchAndActions(searchItems, filteredActions)
  })

  $: void updateItems(search, filteredActions)

  function txListener (tx: Tx): void {
    if (tx._class === core.class.TxWorkspaceEvent) {
      const evt = tx as TxWorkspaceEvent
      if (evt.event === WorkspaceEvent.IndexingUpdate) {
        void updateItems(search, filteredActions)
      }
    }
  }

  onMount(() => {
    addTxListener(txListener)
    return () => {
      removeTxListener(txListener)
    }
  })

  let textHTML: HTMLInputElement
  let phTraslate: string = ''
  let autoFocus = !$deviceOptionsStore.isMobile

  export function focus (): void {
    textHTML.focus()
    autoFocus = false
  }
  $: if (textHTML !== undefined) {
    if (autoFocus) focus()
  }

  $: translateCB(view.string.ActionPlaceholder, {}, $themeStore.language, (res) => {
    phTraslate = res
  })
  let timer: any
  $: _search = search
  function restartTimer (): void {
    clearTimeout(timer)
    timer = setTimeout(() => {
      search = _search
      dispatch('change', _search)
    }, 500)
  }
</script>

<ActionContext
  context={{
    mode: 'none'
  }}
/>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="selectPopup width-40 actionsPopup"
  style:width="15rem"
  on:keydown={onKeydown}
  use:resizeObserver={() => dispatch('changeContent')}
>
  {#if $selectionStore.docs.length > 0 || $focusStore.focus !== undefined || activeAction?.actionPopup !== undefined}
    <div class="actionsDoc flex-between flex-no-shrink">
      {#if $selectionStore.docs.length > 0}
        <div class="item-box">
          <Label label={view.string.NumberItems} params={{ count: $selectionStore.docs.length }} />
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
      {#if activeAction?.actionPopup !== undefined}
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
  {#if activeAction?.actionPopup !== undefined}
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
        textHTML?.focus()
      }}
    />
  {:else}
    <div class="header actionsHeader">
      <input
        class="actionsInput"
        bind:this={textHTML}
        type="text"
        bind:value={_search}
        placeholder={phTraslate}
        on:change={() => {
          restartTimer()
        }}
        on:input={() => {
          restartTimer()
        }}
        on:keydown
      />
    </div>
    <div class="scroll">
      <div class="box">
        <ListView
          bind:this={list}
          count={items.length}
          bind:selection
          on:click={async (evt) => {
            await handleSelection(evt, evt.detail)
          }}
        >
          <svelte:fragment slot="category" let:item={num}>
            {@const item = items[num]}
            {#if item.num === 0}
              {#if item.category !== undefined}
                <div class="actionsCategory">
                  <Label label={item.category.title} />
                </div>
              {/if}
              {#if item.actionCategory}
                <div class="actionsCategory">
                  <Label label={item.actionCategory.label} />
                </div>
              {/if}
            {/if}
          </svelte:fragment>
          <svelte:fragment slot="item" let:item={num}>
            {@const item = items[num]}
            {#if item.item !== undefined}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <div class="ap-menuItem withComp actionsSearchItem">
                <SearchResult value={item.item} />
              </div>
            {/if}
            {#if item.action !== undefined}
              {@const action = item.action}
              <div class="flex-row-center flex-between flex-grow ml-2 text-base cursor-pointer actionsitem">
                <div class="mr-4 {selection === num ? 'caption-color' : 'content-dark-color'}">
                  <Icon icon={action.icon ?? IconArrowLeft} size={'small'} />
                </div>
                <div class="flex-grow {selection === num ? 'caption-color' : 'content-color'}">
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
            {/if}
          </svelte:fragment>
        </ListView>
        <div class="antiVSpacer x2" />
      </div>
    </div>
    <div class="actionsHint">
      <div class="actionsHintLable">
        <span class="hintNav">
          <ChevronUp size={'small'} />
        </span>
        <span class="hintNav">
          <ChevronDown size={'small'} />
        </span>
        <span class="ml mr">
          <Label label={view.string.Type} />
        </span><span class="hintNav">/</span>
        <span class="ml"><Label label={view.string.ToViewCommands} /></span>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .actionsHint {
    border-top: 1px solid var(--theme-popup-divider);
    padding: 0 1.25rem;
    font-size: 0.8125rem;

    .actionsHintLable {
      height: 2.75rem;
      display: flex;
      flex-direction: row;
      align-items: center;

      .hintNav {
        width: 1rem;
        height: 1rem;
        align-items: center;
        justify-content: center;
        display: flex;
        background-color: rgba(0, 0, 0, 0.05);
        margin: 0.13rem;
        font-size: 0.75rem;
      }

      .ml {
        margin-left: 0.62rem;
      }
      .mr {
        margin-right: 0.62rem;
      }
    }
  }

  .actionsDoc {
    margin-top: 1rem;
    margin-left: 1.25rem;
    margin-right: 1.25rem;
  }

  .actionsInput {
    width: 100%;
    caret-color: var(--theme-caret-color);
    border: none;
    border-radius: 0.25rem;
    font-size: 1.125rem;

    &::placeholder {
      color: var(--theme-dark-color);
    }
  }

  .header.actionsHeader {
    padding-top: 1rem;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  .selectPopup.actionsPopup {
    max-height: 30rem;

    .actionsCategory {
      padding: 0.5rem 1.25rem;
      font-size: 0.625rem;
      letter-spacing: 0.0625rem;
      color: var(--theme-dark-color);
      text-transform: uppercase;
      line-height: 1rem;
    }

    .actionsSearchItem {
      height: 2.25rem;
      display: flex;
      margin: 0.25rem;
    }

    .actionsitem {
      font-size: 0.875rem;
      padding: 0.375rem;
      margin: 0.25rem 0.5rem;
    }
  }

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
</style>
