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
  import { State } from '@hcengineering/process'
  import { ButtonIcon, EditBox, IconDelete } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  export let value: State
  const client = getClient()

  async function saveTitle (): Promise<void> {
    await client.update(value, { title: value.title })
  }

  async function handleDelete (): Promise<void> {
    await client.remove(value)
  }
</script>

<div class="w-full container flex-between px-4">
  <EditBox bind:value={value.title} on:change={saveTitle} />
  <div class="tool">
    <ButtonIcon
      icon={IconDelete}
      tooltip={{ label: view.string.Delete, direction: 'bottom' }}
      size="extra-small"
      kind="tertiary"
      on:click={handleDelete}
    />
  </div>
</div>

<style lang="scss">
  .tool {
    visibility: hidden;
  }

  .container:hover {
    .tool {
      visibility: visible;
    }
  }
</style>
