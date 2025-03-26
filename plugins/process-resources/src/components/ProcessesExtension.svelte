<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Card } from '@hcengineering/card'
  import core, { Doc, FindOptions, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Execution } from '@hcengineering/process'
  import {
    Button,
    eventToHTMLElement,
    IconAdd,
    Label,
    registerFocus,
    resizeObserver,
    Section,
    showPopup
  } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import { List, ListSelectionProvider, SelectDirection, ViewletsSettingButton } from '@hcengineering/view-resources'
  import process from '../plugin'
  import RunProcessPopup from './RunProcessPopup.svelte'

  export let card: Card

  const viewletId = process.viewlet.CardExecutions

  $: query = {
    card: card._id
  }

  const options: FindOptions<Execution> = {
    sort: {
      done: SortingOrder.Ascending
    }
  }

  function add (e: MouseEvent): void {
    showPopup(RunProcessPopup, { value: card }, eventToHTMLElement(e))
  }

  let list: List

  const listProvider = new ListSelectionProvider(
    (offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection, noScroll?: boolean) => {
      if (dir === 'vertical') {
        // Select next
        list?.select(offset, of, noScroll)
      }
    }
  )
  let docs: Execution[] = []
  function select () {
    listProvider.update(docs)
    listProvider.updateFocus(docs[0])
    list?.select(0, undefined)
  }
  const selection = listProvider.selection

  // Focusable control with index
  let focused = false
  export let focusIndex = -1
  registerFocus(focusIndex, {
    focus: () => {
      ;(window.document.activeElement as HTMLElement).blur()
      focused = true
      select()
      return true
    },
    isFocus: () => focused
  })

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined = undefined
  preferenceQuery.query(
    view.class.ViewletPreference,
    {
      space: core.space.Workspace,
      attachedTo: process.viewlet.CardExecutions
    },
    (res) => {
      preference = res[0]
    }
  )

  let listWidth: number

  let viewlet: Viewlet | undefined
  let viewOptions: ViewOptions | undefined

  let docsProvided = false
</script>

<Section icon={process.icon.Process} label={process.string.Processes}>
  <svelte:fragment slot="header">
    <div class="buttons-group xsmall-gap">
      <ViewletsSettingButton bind:viewOptions viewletQuery={{ _id: viewletId }} kind={'tertiary'} bind:viewlet />
      <Button id={process.string.RunProcess} icon={IconAdd} kind={'ghost'} on:click={add} />
    </div>
  </svelte:fragment>

  <svelte:fragment slot="content">
    <div
      class="antiSection-empty solid flex-col flex-gap-2 mt-3"
      use:resizeObserver={(evt) => {
        listWidth = evt.clientWidth
      }}
    >
      {#if viewOptions && viewlet}
        <List
          bind:this={list}
          _class={process.class.Execution}
          {viewOptions}
          viewOptionsConfig={viewlet.viewOptions?.other}
          config={preference?.config ?? viewlet.config}
          configurations={undefined}
          {query}
          {options}
          compactMode={listWidth <= 600}
          flatHeaders={true}
          disableHeader={true}
          {listProvider}
          selectedObjectIds={$selection ?? []}
          on:row-focus={(event) => {
            listProvider.updateFocus(event.detail ?? undefined)
          }}
          on:check={(event) => {
            listProvider.updateSelection(event.detail.docs, event.detail.value)
          }}
          on:content={(evt) => {
            docsProvided = true
            docs = evt.detail
            listProvider.update(evt.detail)
          }}
        />
        {#if docsProvided && docs.length === 0}
          <div class="flex-col-center">
            <div class="caption-color">
              <Label label={process.string.NoProcesses} />
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </svelte:fragment>
</Section>
