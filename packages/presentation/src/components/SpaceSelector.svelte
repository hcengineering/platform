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
  import { Class, DocumentQuery, FindOptions, Ref, Space } from '@hcengineering/core'
  import { Asset, IntlString } from '@hcengineering/platform'
  import { AnyComponent, AnySvelteComponent, ButtonKind, ButtonShape, ButtonSize } from '@hcengineering/ui'
  import { ComponentType, createEventDispatcher } from 'svelte'
  import { ObjectCreate } from '../types'
  import SpaceSelect from './SpaceSelect.svelte'

  export let space: Ref<Space> | undefined = undefined
  export let _class: Ref<Class<Space>>
  export let query: DocumentQuery<Space> = { archived: false }
  export let queryOptions: FindOptions<Space> | undefined = {}
  export let label: IntlString
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let shape: ButtonShape = undefined
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let allowDeselect = false
  export let focus = true
  export let component: AnyComponent | AnySvelteComponent | undefined = undefined
  export let componentProps: any | undefined = undefined
  export let autoSelect = true
  export let iconWithEmoji: AnySvelteComponent | Asset | ComponentType | undefined = undefined
  export let defaultIcon: AnySvelteComponent | Asset | ComponentType | undefined = undefined
  export let readonly: boolean = false
  export let findDefaultSpace: (() => Promise<Space | undefined>) | undefined = undefined

  export let create: ObjectCreate | undefined = undefined
  const dispatch = createEventDispatcher()
  let oldSpace = space
  $: if (oldSpace !== space) {
    oldSpace = space
    dispatch('change', space)
  }
</script>

<SpaceSelect
  {create}
  focusIndex={-10}
  {focus}
  {_class}
  spaceQuery={query}
  spaceOptions={queryOptions}
  {allowDeselect}
  {label}
  {size}
  {kind}
  {shape}
  {justify}
  {width}
  {component}
  {componentProps}
  {autoSelect}
  {readonly}
  {iconWithEmoji}
  {defaultIcon}
  bind:value={space}
  on:object
  {findDefaultSpace}
/>
