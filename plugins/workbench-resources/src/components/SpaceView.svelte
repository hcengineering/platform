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
  import core, { Class, Doc, Ref, Space, WithLookup } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import type { AnyComponent } from '@anticrm/ui'
  import view, { Viewlet } from '@anticrm/view'
  import type { ViewConfiguration } from '@anticrm/workbench'

  import SpaceContent from './SpaceContent.svelte'
  import SpaceHeader from './SpaceHeader.svelte'

  export let currentSpace: Ref<Space> | undefined
  export let currentView: ViewConfiguration | undefined
  export let createItemDialog: AnyComponent | undefined
  export let createItemLabel: IntlString | undefined

  let search: string = ''
  let viewlet: WithLookup<Viewlet> | undefined = undefined
  let space: Ref<Space> | undefined = undefined
  let _class: Ref<Class<Doc>> | undefined = undefined

  const client = getClient()

  let viewlets: WithLookup<Viewlet>[] = []

  async function update (attachTo?: Ref<Class<Doc>>, currentSpace?: Ref<Space>): Promise<void> {
    if (attachTo) {
      viewlets = await client.findAll(view.class.Viewlet, { attachTo }, {
        lookup: {
          descriptor: core.class.Class
        }
      })
      _class = attachTo
    }
    viewlet = viewlets[0]
    space = currentSpace
  }

  $: update(currentView?.class, currentSpace)
</script>
<SpaceHeader spaceId={space} {viewlets} {createItemDialog} {createItemLabel} bind:search={search} bind:viewlet={viewlet} />
{#if _class && space}
  <SpaceContent {space} {_class} {search} {viewlet} />
{/if}
