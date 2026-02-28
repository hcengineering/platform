<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { Label } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import { Process } from '@hcengineering/process'

  export let process: Process
  export let params: Record<string, any>
  export let unlock: boolean = false

  const client = getClient()
  const h = client.getHierarchy()

  const keys = params.value ?? []

  const attrs = keys.map((key: string) => h.getAttribute(process.masterTag, key))
</script>

<Label label={unlock ? plugin.string.UnlockField : plugin.string.LockField} />:
{#each attrs as attr}
  <Label label={attr.label} />
{/each}
