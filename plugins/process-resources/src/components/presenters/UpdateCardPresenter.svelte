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
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Process, MethodParams, Step } from '@hcengineering/process'
  import { tooltip, Icon, IconError, Label } from '@hcengineering/ui'
  import plugin from '../../plugin'

  export let step: Step<Card>
  export let params: MethodParams<Card>
  export let process: Process

  const client = getClient()
  $: method = client.getModel().findAllSync(plugin.class.Method, { _id: step.methodId })[0]

  $: attributes = getAttributes(params, process)

  function getAttributes (params: Record<string, any>, process: Process): IntlString[] {
    const res: IntlString[] = []
    for (const key in params) {
      if (params[key] !== undefined) {
        const attr = client.getHierarchy().findAttribute(process.masterTag, key)
        if (attr?.label !== undefined) {
          res.push(attr.label)
        }
      }
    }
    return res
  }
</script>

{#if attributes.length === 0}
  <div class="mr-2" use:tooltip={{ label: plugin.string.NoAttributesForUpdate }}>
    <Icon icon={IconError} size="medium" />
  </div>
{/if}
<div class="flex-row-center flex-gap-1">
  <Label label={method.label} />
  {#if attributes.length > 0}
    {#each attributes as attr}
      <div>
        <Label label={attr} />
      </div>
    {/each}
  {/if}
</div>
