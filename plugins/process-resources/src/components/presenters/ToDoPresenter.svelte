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
  import { getClient } from '@hcengineering/presentation'
  import { ProcessToDo, MethodParams, Step, Process, parseContext } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import { getContext } from '../../utils'
  import ContextValuePresenter from '../attributeEditors/ContextValuePresenter.svelte'

  export let step: Step<ProcessToDo>
  export let params: MethodParams<ProcessToDo>
  export let process: Process

  const client = getClient()
  $: method = client.getModel().findAllSync(plugin.class.Method, { _id: step.methodId })[0]

  $: contextValue = params.title !== undefined ? parseContext(params.title) : undefined

  $: context = getContext(client, process, core.class.TypeString, 'attribute')
</script>

<div class="flex-row-center flex-gap-2">
  <Label label={method.label} />
  {#if params.title}
    {#if contextValue}
      - <ContextValuePresenter {contextValue} {context} />
    {:else}
      - {params.title}
    {/if}
  {/if}
</div>
