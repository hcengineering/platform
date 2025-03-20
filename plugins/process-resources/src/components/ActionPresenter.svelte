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
  import { Doc } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Process, Step } from '@hcengineering/process'
  import { tooltip, Component, Icon, IconError, Label } from '@hcengineering/ui'
  import plugin from '../plugin'
  import { translate } from '@hcengineering/platform'

  export let process: Process
  export let value: Step<Doc>

  const client = getClient()

  $: method = client.getModel().findAllSync(plugin.class.Method, { _id: value.methodId })[0]

  let errorProps: Record<string, any> | undefined = undefined

  $: void validate(value)

  async function validate (value: Step<Doc>): Promise<void> {
    try {
      const res: string[] = []
      for (const key of method.requiredParams) {
        if ((value.params as any)[key] === undefined) {
          const label = client.getHierarchy().findAttribute(method.objectClass, key)?.label
          if (label !== undefined) {
            res.push(await translate(label, {}))
          }
        }
      }
      if (res.length > 0) {
        errorProps = { value: res.join(', '), length: res.length }
      } else {
        errorProps = undefined
      }
    } catch {
      errorProps = undefined
    }
  }
</script>

{#if method !== undefined}
  {#if errorProps !== undefined}
    <div class="mr-2" use:tooltip={{ label: plugin.string.MissingRequiredFields, props: errorProps }}>
      <Icon icon={IconError} size="medium" />
    </div>
  {/if}
  {#if method.presenter !== undefined}
    <Component is={method.presenter} props={{ step: value, params: value.params, process }} />
  {:else}
    <Label label={method.label} />
  {/if}
{/if}
