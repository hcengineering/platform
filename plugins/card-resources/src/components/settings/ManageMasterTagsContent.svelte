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
  import core, { Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    BreadcrumbItem,
    Breadcrumbs,
    Header,
    Location,
    deviceOptionsStore as deviceInfo,
    getCurrentLocation,
    navigate,
    resolvedLocationStore
  } from '@hcengineering/ui'
  import { onDestroy, onMount } from 'svelte'
  import card from '../../plugin'
  import MasterTagEditor from './MasterTagEditor.svelte'

  let masterTag: MasterTag | undefined
  let selectedTagId: Ref<MasterTag> | undefined
  onDestroy(resolvedLocationStore.subscribe(handleLocationChanged))

  function handleLocationChanged ({ path }: Location): void {
    if (path[3] !== 'masterTags' || path[4] === undefined) {
      selectedTagId = undefined
    } else {
      selectedTagId = path[4] as Ref<MasterTag>
    }
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const query = createQuery()
  $: query.query(core.class.Class, { _id: selectedTagId }, (res) => {
    masterTag = res[0]
  })

  function getBreadcrumbs (tag: Ref<MasterTag> | undefined): BreadcrumbItem[] {
    if (tag === undefined) return []
    const toAncestors = hierarchy.getAncestors(card.class.Card)
    const ancestors = hierarchy.getAncestors(tag)
    const filtered = ancestors.filter((it) => !toAncestors.includes(it))
    return filtered.reverse().map((it) => ({
      id: it,
      label: hierarchy.getClass(it).label
    }))
  }

  $: items = getBreadcrumbs(masterTag?._id)

  onMount(() => {
    setTimeout(() => {
      if (masterTag === undefined) $deviceInfo.navigator.visible = true
    }, 500)
  })

  function handleSelect (e: CustomEvent<any>): void {
    const id = items[e.detail]?.id
    if (id !== undefined) {
      const loc = getCurrentLocation()
      loc.path[4] = id
      navigate(loc)
    }
  }
</script>

<div class="hulyComponent">
  {#if masterTag !== undefined}
    <Header adaptive={'disabled'}>
      <Breadcrumbs {items} selected={items.length - 1} size={'large'} on:select={handleSelect} />
    </Header>
    {#key masterTag._id}
      <MasterTagEditor {masterTag} on:change />
    {/key}
  {/if}
</div>
