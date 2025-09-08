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
  import { MasterTag, Tag } from '@hcengineering/card'
  import { AnyAttribute, Ref } from '@hcengineering/core'
  import presentation, { Card, getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import { Process, ProcessFunction } from '@hcengineering/process'
  import { createEventDispatcher } from 'svelte'
  import { getContext } from '../../utils'
  import ProcessAttribute from '../ProcessAttribute.svelte'

  export let func: ProcessFunction
  export let process: Process
  export let masterTag: Ref<MasterTag | Tag>
  export let attribute: AnyAttribute
  export let props: Record<string, any> = {}
  export let allowArray: boolean = false

  let value: any = props?.value ?? ''

  const dispatch = createEventDispatcher()
  const client = getClient()
  const h = client.getHierarchy()

  function save (): void {
    dispatch('close', { value })
  }

  $: presenterClass = getAttributePresenterClass(h, attribute.type)

  $: elementContext = getContext(client, process, presenterClass.attrClass, 'attribute')
</script>

<Card on:close width={'x-small'} label={func.label} canSave okAction={save} okLabel={presentation.string.Save}>
  <div class="grid">
    <ProcessAttribute
      {process}
      {masterTag}
      context={elementContext}
      {attribute}
      editor={undefined}
      presenterClass={{
        attrClass: presenterClass.attrClass,
        category: 'attribute'
      }}
      {allowArray}
      {value}
      on:change={(e) => {
        value = e.detail
      }}
    />
  </div>
</Card>

<style lang="scss">
  .grid {
    display: grid;
    width: 100%;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(1rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.25rem;
    column-gap: 1rem;
    height: min-content;
  }
</style>
