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
  import { Context, Func, parseContext, Process } from '@hcengineering/process'
  import plugin from '../../plugin'
  import ContextValuePresenter from '../attributeEditors/ContextValuePresenter.svelte'

  export let value: Func
  export let process: Process
  export let context: Context

  const ops = {
    [plugin.function.Add]: '+',
    [plugin.function.Subtract]: '-',
    [plugin.function.Multiply]: '×',
    [plugin.function.Divide]: '/',
    [plugin.function.Modulo]: '%',
    [plugin.function.Power]: '^'
  }

  $: op = ops[value.func as keyof typeof ops]

  $: val = value.props?.value
  $: contextValue = parseContext(val)
</script>

<div class="flex-row-center flex-gap-2">
  {#if op !== undefined}
    {op}
  {/if}
  {#if contextValue && context}
    <ContextValuePresenter {contextValue} {context} {process} />
  {:else}
    {val}
  {/if}
</div>
