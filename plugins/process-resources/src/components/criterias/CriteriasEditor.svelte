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
  import { Doc, DocumentQuery } from '@hcengineering/core'
  import { Process } from '@hcengineering/process'
  import { createEventDispatcher } from 'svelte'
  import AttributeCriteria from './AttributeCriteria.svelte'

  export let readonly: boolean
  export let process: Process
  export let keys: string[]
  export let params: DocumentQuery<Doc>

  const dispatch = createEventDispatcher()

  function change (e: CustomEvent<any>, key: string): void {
    if (e.detail?.value != null && e.detail.value !== '') {
      ;(params as any)[key] = e.detail.value
    } else if (Object.hasOwn(params, key)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (params as any)[key]
    }
    params = params
    dispatch('change', params)
  }
</script>

<div class="editor-grid">
  {#each keys as key}
    <AttributeCriteria
      {process}
      {key}
      {params}
      {readonly}
      on:change={(e) => {
        change(e, key)
      }}
      on:delete={() => {
        dispatch('remove', { key })
      }}
    />
  {/each}
</div>
