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
  import { Process, UserResult } from '@hcengineering/process'
  import { Button } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import ResultEditor from './ResultEditor.svelte'

  export let process: Process
  export let result: UserResult[] | undefined

  const dispatch = createEventDispatcher()

  let items: (UserResult | null)[] = result ?? []

  function handleChange (e: CustomEvent<UserResult>, index: number) {
    if (e.detail !== undefined) {
      items[index === -1 ? items.length : index] = e.detail
      result = items.filter((r) => r != null)
      dispatch('change', result)
    }
  }

  function onAdd (): void {
    items.push(null)
    items = items
  }

  function remove (index: number): void {
    items.splice(index, 1)
    items = items
    result = items.filter((r) => r != null)
    dispatch('change', result)
  }
</script>

{#each items as item, i}
  <ResultEditor
    {process}
    result={item}
    on:change={(e) => {
      handleChange(e, i)
    }}
    on:remove={() => {
      remove(i)
    }}
  />
{/each}
<div class="flex-center mt-4">
  <Button label={plugin.string.AddResult} width={'100%'} kind={'link-bordered'} size={'large'} on:click={onAdd} />
</div>
