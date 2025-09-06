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
  import { Context, Func, Process } from '@hcengineering/process'
  import { Component, Label } from '@hcengineering/ui'

  export let value: Func
  export let process: Process
  export let context: Context

  const client = getClient()
  $: func = client.getModel().findObject(value.func)
</script>

{#if func !== undefined}
  <div class="container">
    {#if func.presenter !== undefined}
      <Component is={func.presenter} props={{ value, context, process }} />
    {:else}
      <Label label={func.label} />
    {/if}
  </div>
{/if}

<style lang="scss">
  .container {
    font-size: 0.66rem;
    line-height: 0.75rem;
    font-style: italic;
    padding: 0.25rem 0.125rem;
    border-radius: 0.25rem;
    color: var(--theme-content-color);
    background-color: var(--theme-table-border-color);
  }
</style>
