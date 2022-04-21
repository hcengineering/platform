<!--
// Copyright © 2022 Hardcore Engineering Inc
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
  import { Class, Doc, Ref, Space } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { CircleButton, IconAdd } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import { createAttachments } from '../utils'

  export let loading: number = 0
  export let inputFile: HTMLInputElement

  export let objectClass: Ref<Class<Doc>>
  export let objectId: Ref<Doc>
  export let space: Ref<Space>

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function fileSelected() {
    const list = inputFile.files
    if (list === null || list.length === 0) return

    loading++
    try {
      await createAttachments(client, list, { objectClass, objectId, space })
    } finally {
      loading--
    }

    dispatch('attached')
  }

  function openFile() {
    inputFile.click()
  }
</script>

<div>
  {#if $$slots.control}
    <slot name="control" click={openFile} />
  {:else}
    <CircleButton icon={IconAdd} size="small" selected on:click={openFile} />
  {/if}
  <input
    bind:this={inputFile}
    multiple
    type="file"
    name="file"
    id="file"
    style="display: none"
    on:change={fileSelected}
  />
</div>
