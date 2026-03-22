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
  import core from '@hcengineering/core'
  import { getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import { parseContext, type Process, type Step } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import { getContext } from '../../utils'
  import plugin from '../../plugin'
  import ContextValuePresenter from '../attributeEditors/ContextValuePresenter.svelte'

  export let step: Step<any>
  export let process: Process

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: method = client.getModel().findAllSync(plugin.class.Method, { _id: step.methodId })[0]
  $: contextValue = parseContext(step.params.value)

  $: typeId = step.params.typeId ?? core.class.TypeAny
  $: presenterClass = getAttributePresenterClass(hierarchy, { _class: typeId } as any)
  $: context = getContext(client, process, typeId, presenterClass.category)
</script>

<div class="flex-row-center flex-gap-2">
  <Label label={method.label} />
  {#if contextValue}
    :
    <div class="title">
      <ContextValuePresenter {contextValue} {context} {process} />
    </div>
  {/if}
</div>

<style lang="scss">
  .title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--theme-caption-color);
  }
</style>
