<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import { parseContext, Process } from '@hcengineering/process'
  import { AnyComponent, Component, Label } from '@hcengineering/ui'
  import { AttributeCategory } from '@hcengineering/view'
  import { findAttributePresenter } from '@hcengineering/view-resources'
  import view from '@hcengineering/view-resources/src/plugin'
  import { Mode, Modes, parseValue } from '../../query'
  import ContextValuePresenter from '../attributeEditors/ContextValuePresenter.svelte'
  import { getContext } from '../../utils'
  import core from '@hcengineering/core'

  export let process: Process
  export let key: string
  export let value: any

  const client = getClient()
  const hierarchy = client.getHierarchy()
  $: attribute = client.getHierarchy().findAttribute(process.masterTag, key)
  $: [val, selectedMode] = parseValue(Object.values(Modes), value)
  $: presenterClass = attribute !== undefined ? getAttributePresenterClass(hierarchy, attribute.type) : undefined

  function isArraySize (category: AttributeCategory | undefined, selectedMode: Mode): boolean {
    return category === 'array' && selectedMode.id.startsWith('size')
  }

  function getPresenter (key: string): AnyComponent | undefined {
    const isArraySizeCriteria = isArraySize(presenterClass?.category, selectedMode)
    if (isArraySizeCriteria) {
      return view.component.NumberPresenter
    }
    const res = findAttributePresenter(client, process.masterTag, key)
    return res
  }

  $: presenter = getPresenter(key)

  $: contextValue = parseContext(val)

  $: context =
    presenterClass !== undefined
      ? isArraySize(presenterClass.category, selectedMode)
        ? getContext(client, process, core.class.TypeNumber, 'attribute')
        : getContext(client, process, presenterClass.attrClass, presenterClass.category)
      : undefined
</script>

{#if attribute}
  <div class="title">
    <Label label={attribute.label} />
  </div>
  <Label label={selectedMode.label} />
  {#if presenter && !selectedMode.withoutEditor}
    {#if contextValue && context}
      <ContextValuePresenter {contextValue} {context} {process} />
    {:else}
      <Component is={presenter} props={{ value: val, readonly: true }} />
    {/if}
  {/if}
{/if}

<style lang="scss">
  .title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--theme-caption-color);
  }
</style>
