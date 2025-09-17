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
  import { Context, Process, SelectedContextFunc } from '@hcengineering/process'
  import { Component, Label } from '@hcengineering/ui'

  export let process: Process
  export let contextValue: SelectedContextFunc
  export let context: Context

  const client = getClient()
  $: func = client.getModel().findObject(contextValue.func)
</script>

{#if func !== undefined}
  {#if func.presenter !== undefined}
    <Component is={func.presenter} props={{ context, contextValue, process }} />
  {:else}
    <Label label={func.label} />
  {/if}
{/if}
