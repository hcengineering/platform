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
  import type { Ref, Class, Doc, Space, WithLookup } from '@anticrm/core'
  import type { Viewlet } from '@anticrm/view'
  import { Component } from '@anticrm/ui'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space>
  export let search: string
  export let viewlet: WithLookup<Viewlet> | undefined
</script>

{#if viewlet}
  {#key space}
    <div class="spacecontent-container">
      <Component is={viewlet.$lookup?.descriptor?.component} props={ {
        _class,
        space,
        open: viewlet.open,
        options: viewlet.options, 
        config: viewlet.config,
        search
      } } />
    </div>
  {/key}
{/if}

<style lang="scss">
  .spacecontent-container {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  }
</style>
