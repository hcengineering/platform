<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import core from '@hcengineering/core'
  import { Request } from '@hcengineering/hr'
  import { getClient } from '@hcengineering/presentation'
  import { StyledTextArea } from '@hcengineering/text-editor'
  import { createFocusManager, FocusHandler } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  export let object: Request

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function onChangeDescription (): Promise<void> {
    if (object === undefined) return
    await client.update(object, {
      description: object.description
    })
  }

  const manager = createFocusManager()

  onMount(() => {
    dispatch('open', {
      ignoreKeys: ['comments', 'description']
    })
  })
</script>

<FocusHandler {manager} />

{#if object !== undefined}
  <div class="flex-row-stretch flex-grow">
    <StyledTextArea
      bind:content={object.description}
      placeholder={core.string.Description}
      showButtons={false}
      on:value={onChangeDescription}
    />
  </div>
{/if}
