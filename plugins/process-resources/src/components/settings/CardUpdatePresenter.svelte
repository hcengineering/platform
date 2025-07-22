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
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Trigger, Process } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'

  export let process: Process
  export let params: Record<string, any>

  const client = getClient()

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

{#if attributes.length > 0}
  :
  {#each attributes as attr}
    <div class="title">
      <Label label={attr} />
    </div>
  {/each}
{/if}

<style lang="scss">
  .title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--theme-caption-color);
  }
</style>
