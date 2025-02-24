<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import core, { SortingOrder, toIdMap, type IdMap, type Ref, type StatusCategory } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import tracker, { type Issue, type Project } from '@hcengineering/tracker'
  import {
    createFocusManager,
    deviceOptionsStore,
    EditWithIcon,
    FocusHandler,
    Icon,
    IconCheck,
    IconSearch,
    Label,
    ListView,
    resizeObserver,
    showPanel,
    Spinner,
    type SelectPopupValueType
  } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { subIssueListProvider, type IssueRef } from '../../../utils'
  import RelatedIssuePresenter from './RelatedIssuePresenter.svelte'

  export let refs: IssueRef[]

  export let placeholder: IntlString | undefined = undefined
  export let placeholderParam: any | undefined = undefined
  export let searchable: boolean = false
  export let width: 'medium' | 'large' | 'full' = 'medium'
  export let showShadow: boolean = true
  export let embedded: boolean = false
  export let componentLink: boolean = false
  export let loading: boolean = false
  export let currentProject: Project

  let popupElement: HTMLDivElement | undefined = undefined
  let search: string = ''

  const dispatch = createEventDispatcher()

  let selection = 0
  let list: ListView

  let selected: any

  let subIssues: Issue[] = []

  const query = createQuery()
  query.query(
    tracker.class.Issue,
    { _id: { $in: refs.map((it) => it._id) } },
    (res) => {
      subIssues = res
    },
    {
      sort: { rank: SortingOrder.Ascending },
      showArchived: true
    }
  )

  let categories: IdMap<StatusCategory> = new Map()

  void getClient()
    .findAll(core.class.StatusCategory, {})
    .then((res) => {
      categories = toIdMap(res)
    })

  $: value = subIssues.map((iss) => {
    const c = $statusStore.byId.get(iss.status)?.category
    const category = c !== undefined ? categories.get(c) : undefined
    return {
      id: iss._id,
      isSelected: false,
      component: RelatedIssuePresenter,
      props: { project: currentProject, issue: iss },
      category:
        category !== undefined
          ? {
              label: category.label,
              icon: category.icon
            }
          : undefined
    }
  })

  $: hasSelected = value.some((v) => v.isSelected)

  function openIssue (target: Ref<Issue>): void {
    subIssueListProvider(subIssues, target)
    showPanel(tracker.component.EditIssue, target, tracker.class.Issue, 'content')
  }

  function sendSelect (id: SelectPopupValueType['id']): void {
    selected = id
    openIssue(id as Ref<Issue>)
  }

  export function onKeydown (key: KeyboardEvent): boolean {
    if (key.code === 'Tab') {
      dispatch('close')
      key.preventDefault()
      key.stopPropagation()
      return true
    }
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection - 1)
      return true
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
      return true
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      sendSelect(value[selection].id)
      return true
    }
    return false
  }
  const manager = createFocusManager()

  $: if (popupElement) {
    popupElement.focus()
  }
</script>

<FocusHandler {manager} />

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="selectPopup"
  bind:this={popupElement}
  tabindex="0"
  class:noShadow={!showShadow}
  class:full-width={width === 'full'}
  class:max-width-40={width === 'large'}
  class:embedded
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
  on:keydown={onKeydown}
>
  {#if searchable}
    <div class="header">
      <EditWithIcon
        icon={IconSearch}
        size={'large'}
        width={'100%'}
        autoFocus={!$deviceOptionsStore.isMobile}
        bind:value={search}
        {placeholder}
        {placeholderParam}
        on:change
      />
    </div>
  {:else}
    <div class="menu-space" />
  {/if}
  <div class="scroll">
    <div class="box">
      <ListView bind:this={list} count={value.length} bind:selection on:changeContent={() => dispatch('changeContent')}>
        <svelte:fragment slot="item" let:item={itemId}>
          {@const item = value[itemId]}
          <button
            class="menu-item withList w-full"
            on:click={() => {
              sendSelect(item.id)
            }}
            disabled={loading}
          >
            <div class="flex-row-center flex-grow" class:pointer-events-none={!componentLink}>
              {#if item.component}
                <div class="flex-grow clear-mins"><svelte:component this={item.component} {...item.props} /></div>
              {/if}
              {#if hasSelected}
                <div class="check">
                  {#if item.isSelected}
                    <Icon icon={IconCheck} size={'small'} />
                  {/if}
                </div>
              {/if}
              {#if item.id === selected && loading}
                <Spinner size={'small'} />
              {/if}
            </div>
          </button>
        </svelte:fragment>
        <svelte:fragment slot="category" let:item={row}>
          {@const obj = value[row]}
          {#if obj.category && ((row === 0 && obj.category.label !== undefined) || obj.category.label !== value[row - 1]?.category?.label)}
            {#if row > 0}<div class="menu-separator" />{/if}
            <div class="menu-group__header flex-row-center">
              <span class="overflow-label">
                <Label label={obj.category.label} />
              </span>
            </div>
          {/if}
        </svelte:fragment>
      </ListView>
    </div>
  </div>
  {#if !embedded}<div class="menu-space" />{/if}
</div>
