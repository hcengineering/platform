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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { MethodParams, Process, State } from '@hcengineering/process'
  import { createEventDispatcher } from 'svelte'
  import ProcessAttributeEditor from './ProcessAttributeEditor.svelte'

  export let process: Process
  export let state: State
  export let _class: Ref<Class<Doc>>
  export let params: MethodParams<Doc>
  export let keys: string[] = []

  const dispatch = createEventDispatcher()

  function change (e: CustomEvent<any>, key: string): void {
    if (e.detail?.value != null && e.detail.value !== '') {
      ;(params as any)[key] = e.detail.value
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (params as any)[key]
    }
    params = params
    dispatch('change', params)
  }
</script>

<div class="grid">
  {#each keys as key}
    <ProcessAttributeEditor
      {process}
      {state}
      {_class}
      {key}
      object={params}
      on:update={(e) => {
        change(e, key)
      }}
    />
  {/each}
</div>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.25rem;
    column-gap: 1rem;
    margin: 0.25rem 2rem 0;
    width: calc(100% - 4rem);
    height: min-content;
  }
</style>
