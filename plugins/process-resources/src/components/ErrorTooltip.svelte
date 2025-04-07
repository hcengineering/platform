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
  import { translate } from '@hcengineering/platform'
  import { ExecutionError } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'

  export let value: ExecutionError[]

  async function fillProps (value: ExecutionError[]): Promise<ExecutionError[]> {
    for (const val of value) {
      for (const key in val.intlProps) {
        try {
          val.props[key] = await translate(val.intlProps[key], {})
        } catch (err) {
          console.error(err)
        }
      }
    }
    return value
  }
</script>

<div class="p-2 flex-col-center flex-gap-2">
  {#await fillProps(value) then res}
    {#each res as error}
      <div><Label label={error.error} params={error.props} /></div>
    {/each}
  {/await}
</div>
