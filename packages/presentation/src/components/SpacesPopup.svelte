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
  import type { Class, Doc, DocumentQuery, Ref, Space } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { AnyComponent } from '@anticrm/ui'
  import ObjectPopup from './ObjectPopup.svelte'
  import SpaceInfo from './SpaceInfo.svelte'

  export let _class: Ref<Class<Space>>
  export let selected: Ref<Space> | undefined
  export let spaceQuery: DocumentQuery<Space> | undefined
  export let create:
    | {
        component: AnyComponent
        label: IntlString
      }
    | undefined = undefined

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
  {selected}
  bind:docQuery={spaceQuery}
  multiSelect={false}
  allowDeselect={false}
  shadows={true}
  create={_create}
  on:update
  on:close
>
  <svelte:fragment slot="item" let:item={space}>
    <SpaceInfo size={'large'} value={space} />
  </svelte:fragment>
</ObjectPopup>
