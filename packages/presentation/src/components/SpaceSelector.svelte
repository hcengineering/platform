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
  import type { Class, DocumentQuery, Ref, Space } from '@anticrm/core'
  import type { IntlString } from '@anticrm/platform'
  import { ButtonKind, ButtonSize } from '@anticrm/ui'
  import { ObjectCreate } from '../types'
  import SpaceSelect from './SpaceSelect.svelte'

  export let space: Ref<Space> | undefined = undefined
  export let _class: Ref<Class<Space>>
  export let query: DocumentQuery<Space> = { archived: false }
  export let label: IntlString
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let allowDeselect = false
  export let focus = true

  export let create: ObjectCreate | undefined = undefined
</script>

<SpaceSelect
  {create}
  focusIndex={-10}
  {focus}
  {_class}
  spaceQuery={query}
  {allowDeselect}
  {label}
  {size}
  {kind}
  {justify}
  {width}
  bind:value={space}
  on:change={(evt) => {
    space = evt.detail
  }}
/>
