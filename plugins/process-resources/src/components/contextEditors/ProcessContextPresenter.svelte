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
  import { getClient } from '@hcengineering/presentation'
  import { ProcessContext, State, Transition } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import TransitionPresenter from '../settings/TransitionPresenter.svelte'
  import process from '../../plugin'

  export let context: ProcessContext

  const client = getClient()
  const model = client.getModel()

  $: producer = model.findObject(context.producer)
  $: action = producer?.actions?.find((it) => it._id === context.action)
  $: method = action && model.findObject(action.methodId)

  function isState (it: State | Transition): it is State {
    return it._class === process.class.State
  }
</script>

{#if context.name !== undefined && context.name !== ''}
  {context.name}
{:else}
  {#if context.isResult}
    <Label label={process.string.Result} />:
  {/if}
  {#if producer !== undefined}
    {#if isState(producer)}
      {producer.title}
    {:else}
      <TransitionPresenter transition={producer} />
    {/if}
  {/if}
  {#if method !== undefined}
    ->
    <Label label={method.label} />
  {/if}
{/if}
