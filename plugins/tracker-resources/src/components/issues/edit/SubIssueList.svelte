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
  import { Class, Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { ActionContext } from '@hcengineering/presentation'
  import { Issue, Project } from '@hcengineering/tracker'
  import { AnyComponent, AnySvelteComponent, registerFocus } from '@hcengineering/ui'
  import { ViewOptions, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { List, ListSelectionProvider, SelectDirection, selectionStore } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import { createEventDispatcher } from 'svelte'

  export let query: DocumentQuery<Issue> | undefined = undefined
  export let viewlet: Viewlet
  export let viewOptions: ViewOptions
  export let disableHeader: boolean = false
  export let compactMode: boolean = false
  export let configurations: Record<Ref<Class<Doc>>, Viewlet['config']> = {}
  export let preference: ViewletPreference[] = []

  // Extra properties
  export let projects: Map<Ref<Project>, Project> | undefined

  let list: List

  const listProvider = new ListSelectionProvider(
    (offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection, noScroll?: boolean) => {
      if (dir === 'vertical') {
        // Select next
        list?.select(offset, of, noScroll)
      }
    }
  )
  let docs: Doc[] = []
  function select () {
    listProvider.update(docs)
    listProvider.updateFocus(docs[0])
    list?.select(0, undefined)
  }

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

  export let createItemDialog: AnySvelteComponent | AnyComponent | undefined = undefined
  export let createItemLabel: IntlString | undefined = undefined
  export let createItemDialogProps: Record<string, any> | undefined = undefined

  const dispatch = createEventDispatcher()
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

{#if viewlet}
  <List
    bind:this={list}
    _class={tracker.class.Issue}
    {viewOptions}
    viewOptionsConfig={viewlet.viewOptions?.other}
    config={preference.find((it) => it.attachedTo === viewlet._id)?.config ?? viewlet.config}
    {configurations}
    {query}
    flatHeaders={true}
    props={{ projects }}
    {disableHeader}
    {createItemDialog}
    {createItemDialogProps}
    {createItemLabel}
    selectedObjectIds={$selectionStore ?? []}
    {compactMode}
    on:row-focus={(event) => {
      listProvider.updateFocus(event.detail ?? undefined)
    }}
    on:check={(event) => {
      listProvider.updateSelection(event.detail.docs, event.detail.value)
    }}
    on:content={(evt) => {
      docs = evt.detail
      listProvider.update(evt.detail)
      dispatch('docs', docs)
    }}
  />
{/if}
