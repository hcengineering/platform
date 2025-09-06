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
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { parseContext, Process, Trigger } from '@hcengineering/process'
  import { Component, Icon, IconError, Label, tooltip } from '@hcengineering/ui'

  export let value: Ref<Trigger>
  export let process: Process
  export let params: Record<string, any>
  export let withLabel: boolean = false

  const client = getClient()
  $: trigger = client.getModel().findObject(value)

  let error: boolean = false

  $: validate(params)

  function validate (params: Record<string, any>): void {
    if (trigger === undefined) {
      error = false
    }
    for (const key of trigger?.requiredParams ?? []) {
      const val = params[key]
      if (val === undefined) {
        error = true
        return
      }
      const context = parseContext(val)
      if (context !== undefined && context.type === 'context') {
        if (process.context[context.id] === undefined) {
          error = true
          return
        }
      }
    }
    error = false
  }
</script>

{#if trigger}
  <div class="flex-row-center flex-gap-1" use:tooltip={{ label: trigger.label }}>
    <Icon icon={error ? IconError : trigger.icon} size={'medium'} />
    {#if withLabel}
      <Label label={trigger.label} />
      {#if trigger.presenter}
        <Component is={trigger.presenter} props={{ process, params }} />
      {/if}
    {/if}
  </div>
{/if}
