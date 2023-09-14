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
  import core, { Doc } from '@hcengineering/core'
  import { AttributeModel } from '@hcengineering/view'
  import { FixedColumn } from '../..'
  import DividerPresenter from './DividerPresenter.svelte'

  export let docObject: Doc
  export let attributeModel: AttributeModel
  export let onChange: ((value: any) => void) | undefined
  export let value: any
  export let props: Record<string, any>
  export let hideDivider: boolean = false
  export let compactMode: boolean = false

  $: dp = attributeModel?.displayProps

  function joinProps (attribute: AttributeModel, object: Doc, props: Record<string, any>) {
    const clearAttributeProps = attribute.props
    if (attribute.attribute?.type._class === core.class.EnumOf) {
      return { ...clearAttributeProps, type: attribute.attribute.type, ...props }
    }
    return { object, ...clearAttributeProps, space: object.space, ...props }
  }
</script>

{#if dp?.dividerBefore === true && !hideDivider}
  <DividerPresenter />
{/if}
{#if dp?.fixed}
  <FixedColumn key={`list_item_${dp.key}`} justify={dp.fixed}>
    <svelte:component
      this={attributeModel.presenter}
      {value}
      {onChange}
      kind={'list'}
      {compactMode}
      {...joinProps(attributeModel, docObject, props)}
    />
  </FixedColumn>
{:else}
  <svelte:component
    this={attributeModel.presenter}
    {value}
    {onChange}
    kind={'list'}
    {compactMode}
    {...joinProps(attributeModel, docObject, props)}
  />
{/if}
