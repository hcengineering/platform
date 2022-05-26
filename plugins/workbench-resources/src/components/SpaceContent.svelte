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
  import type { Class, Doc, Ref, Space, WithLookup } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Component, Loading } from '@anticrm/ui'
  import view, { Viewlet, ViewletPreference } from '@anticrm/view'
  import type { Filter } from '@anticrm/view'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space>
  export let search: string
  export let viewlet: WithLookup<Viewlet> | undefined
  export let filters: Filter[] = []

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined
  let loading = true

  $: viewlet &&
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        attachedTo: viewlet._id
      },
      (res) => {
        preference = res[0]
        loading = false
      },
      { limit: 1 }
    )
</script>

{#if viewlet}
  {#key space}
    {#if viewlet.$lookup?.descriptor?.component}
      {#if loading}
        <Loading />
      {:else}
        <Component
          is={viewlet.$lookup?.descriptor?.component}
          props={{
            _class,
            space,
            options: viewlet.options,
            config: preference?.config ?? viewlet.config,
            viewlet,
            filters,
            search
          }}
        />
      {/if}
    {/if}
  {/key}
{/if}
