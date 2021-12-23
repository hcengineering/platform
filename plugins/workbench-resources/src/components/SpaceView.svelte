<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import type { Ref, Space, WithLookup } from '@anticrm/core'
  import type { AnyComponent } from '@anticrm/ui'
  import type { Viewlet } from '@anticrm/view'
  import type { ViewConfiguration } from '@anticrm/workbench'

  import SpaceContent from './SpaceContent.svelte'
  import SpaceHeader from './SpaceHeader.svelte'

  export let currentSpace: Ref<Space> | undefined
  export let currentView: ViewConfiguration | undefined
  export let createItemDialog: AnyComponent | undefined

  let search: string = ''
  let viewlet: WithLookup<Viewlet> | undefined = undefined


  function resetSearch (_space: Ref<Space> | undefined): void {
    search = ''
  }

  $: resetSearch(currentSpace)
</script>

<SpaceHeader spaceId={currentSpace} _class={currentView?.class} {createItemDialog} bind:search={search} bind:viewlet={viewlet} />
{#if currentView && currentSpace}
  <SpaceContent space={currentSpace} _class={currentView.class} {search} {viewlet} />
{/if}
