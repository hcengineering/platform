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
  import { MasterTag } from '@hcengineering/card'
  import core, { Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    AnyComponent,
    AnySvelteComponent,
    BreadcrumbItem,
    Breadcrumbs,
    Header,
    Location,
    resizeObserver,
    deviceOptionsStore as deviceInfo,
    getCurrentLocation,
    navigate,
    resolvedLocationStore
  } from '@hcengineering/ui'
  import { onDestroy, onMount } from 'svelte'
  import card from '../../plugin'
  import MasterTagEditor from './MasterTagEditor.svelte'
  import { getResource } from '@hcengineering/platform'

  let masterTag: MasterTag | undefined
  let visibleSecondNav: boolean = true
  let selectedTagId: Ref<MasterTag> | undefined

  function handleLocationChanged ({ path }: Location): void {
    if (path[3] !== 'types' || path[4] === undefined) {
      selectedTagId = undefined
    } else {
      selectedTagId = path[4] as Ref<MasterTag>
    }

    selectSubItem(path[5] as AnyComponent, path[6] as Ref<Doc>)
  }

  let selectedSubObjectId: Ref<Doc> | undefined = undefined
  let subEditor: AnySvelteComponent | undefined = undefined
  let subEditorParamas: SubEditorParams[] = []
  interface SubEditorParams {
    id: Ref<Doc>
    editor: AnyComponent
    title: string
  }

  function selectSubItem (editorId: AnyComponent | undefined, objId: Ref<Doc> | undefined): void {
    if (editorId !== undefined && objId !== undefined) {
      selectedSubObjectId = objId
      void getResource(editorId)
        .then((res) => (subEditor = res))
        .catch((err) => {
          subEditor = undefined
          subEditorParamas = []
          console.error(err)
        })
    } else {
      subEditorParamas = []
      selectedSubObjectId = undefined
      subEditor = undefined
    }
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const query = createQuery()
  $: query.query(core.class.Class, { _id: selectedTagId }, (res) => {
    masterTag = res[0]
  })

  function handleSubEditorOpen (event: CustomEvent): void {
    if (Array.isArray(event.detail)) {
      subEditorParamas = event.detail
    }
  }

  function getBreadcrumbs (tag: Ref<MasterTag> | undefined, subEditorParams: SubEditorParams[]): BreadcrumbItem[] {
    if (tag === undefined) return []
    const toAncestors = hierarchy.getAncestors(card.class.Card)
    const ancestors = hierarchy.getAncestors(tag)
    const filtered = ancestors.filter((it) => !toAncestors.includes(it))
    const res: BreadcrumbItem[] = filtered.reverse().map((it) => ({
      id: it,
      label: hierarchy.getClass(it).label
    }))
    for (const subEditorParam of subEditorParams) {
      res.push({
        id: subEditorParam.id,
        title: subEditorParam.title
      })
    }
    return res
  }

  $: items = getBreadcrumbs(masterTag?._id, subEditorParamas)

  onMount(() => {
    setTimeout(() => {
      if (masterTag === undefined) $deviceInfo.navigator.visible = true
    }, 500)
  })

  function handleSelect (e: CustomEvent<any>): void {
    const id = items[e.detail]?.id
    if (id !== undefined) {
      const isSub = subEditorParamas.find((it) => it.id === id)
      const loc = getCurrentLocation()
      if (isSub !== undefined) {
        loc.path[5] = isSub.editor
        loc.path[6] = isSub.id
      } else {
        loc.path[4] = id
        loc.path.length = 5
      }
      navigate(loc)
    }
  }

  onDestroy(resolvedLocationStore.subscribe(handleLocationChanged))
</script>

<div
  class="hulyComponent"
  use:resizeObserver={(element) => {
    visibleSecondNav = element.clientWidth > 720
  }}
>
  {#if masterTag !== undefined}
    <Header adaptive={'disabled'}>
      <Breadcrumbs {items} selected={items.length - 1} size={'large'} on:select={handleSelect} />
    </Header>
    {#if subEditor === undefined}
      {#key masterTag._id}
        <MasterTagEditor {masterTag} {visibleSecondNav} on:change />
      {/key}
    {:else}
      <svelte:component
        this={subEditor}
        _id={selectedSubObjectId}
        {masterTag}
        {visibleSecondNav}
        on:change={handleSubEditorOpen}
      />
    {/if}
  {/if}
</div>
