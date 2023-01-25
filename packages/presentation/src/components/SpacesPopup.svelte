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
  import type { Class, Doc, DocumentQuery, FindOptions, Ref, Space } from '@hcengineering/core'
  import { AnySvelteComponent, ButtonSize } from '@hcengineering/ui'
  import { ObjectCreate } from '../types'
  import ObjectPopup from './ObjectPopup.svelte'
  import SpaceInfo from './SpaceInfo.svelte'

  export let _class: Ref<Class<Space>>
  export let selected: Ref<Space> | undefined
  export let spaceQuery: DocumentQuery<Space> | undefined
  export let spaceOptions: FindOptions<Space> | undefined = {}
  export let create: ObjectCreate | undefined = undefined
  export let size: ButtonSize = 'large'
  export let allowDeselect = false
  export let component: AnySvelteComponent | undefined = undefined
  export let componentProps: any | undefined = undefined

  $: _create =
    create !== undefined
      ? {
          ...create,
          update: (doc: Doc) => (doc as Space).name
        }
      : undefined
</script>

<ObjectPopup
  {_class}
  options={spaceOptions}
  {selected}
  bind:docQuery={spaceQuery}
  multiSelect={false}
  {allowDeselect}
  shadows={true}
  create={_create}
  on:update
  on:close
>
  <svelte:fragment slot="item" let:item={space}>
    {#if component}
      <svelte:component this={component} {...componentProps} {size} value={space} />
    {:else}
      <SpaceInfo {size} value={space} />
    {/if}
  </svelte:fragment>
</ObjectPopup>
