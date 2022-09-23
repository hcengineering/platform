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
  import type { Ref } from '@hcengineering/core'
  import type { Application } from '@hcengineering/workbench'
  import { createEventDispatcher } from 'svelte'
  import AppItem from './AppItem.svelte'
  import { Scroller } from '@hcengineering/ui'

  export let active: Ref<Application> | undefined
  export let apps: Application[] = []
  export let direction: 'vertical' | 'horizontal' = 'vertical'

  const dispatch = createEventDispatcher()
</script>

<div class="flex align-center clear-mins apps-{direction}">
  <Scroller invertScroll padding={'.5rem .5rem'} horizontal={direction === 'horizontal'} contentDirection={direction}>
    {#each apps as app}
      <AppItem
        selected={app._id === active}
        icon={app.icon}
        label={app.label}
        action={async () => {
          dispatch('active', app)
        }}
        notify={false}
      />
    {/each}
  </Scroller>
</div>

<style lang="scss">
  .apps-horizontal {
    margin: 0 1rem;
    padding: 0 0.25rem;
  }
  .apps-vertical {
    margin: 1rem 0;
    padding: 0.25rem 0;
  }
</style>
