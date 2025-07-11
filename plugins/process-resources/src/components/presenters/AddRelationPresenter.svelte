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
  import { Card } from '@hcengineering/card'
  import { Association, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { MethodParams, parseContext, Process, Step } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import { getContext } from '../../utils'
  import ContextValuePresenter from '../attributeEditors/ContextValuePresenter.svelte'

  export let step: Step<Card>
  export let process: Process
  export let params: MethodParams<Card>

  const client = getClient()
  $: method = client.getModel().findAllSync(plugin.class.Method, { _id: step.methodId })[0]

  $: association = params.association as Ref<Association> | undefined
  $: selected = association && client.getModel().findObject(association)
  $: direction = params.direction as 'A' | 'B' | undefined

  $: assoc = association && client.getModel().findObject(association)
  $: targetClass = assoc && direction ? (direction === 'A' ? assoc.classA : assoc.classB) : undefined

  $: contextValue = params._id !== undefined ? parseContext(params._id) : undefined
  $: context = targetClass !== undefined ? getContext(client, process, targetClass, 'object') : undefined
</script>

<div class="flex-row-center flex-gap-1">
  <Label label={method.label} />:
  <div class="title">
    {#if selected && direction}
      {direction === 'A' ? selected.nameA : selected.nameB}
    {/if}
  </div>
  {#if contextValue !== undefined && context !== undefined}
    <ContextValuePresenter {contextValue} {context} {process} />
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
