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
  import presentation, { Card, getAttrEditor, getClient } from '@hcengineering/presentation'
  import { ContextId, ExecutionContext, UserResult } from '@hcengineering/process'
  import { Component, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let results: UserResult[]
  export let context: ExecutionContext

  const dispatch = createEventDispatcher()
  const client = getClient()
  const h = client.getHierarchy()

  let values: Record<ContextId, any> = {}

  results.forEach((r) => {
    values[r._id] = context[r._id]
    values = values
  })

  export function canClose (): boolean {
    return false
  }

  function save (): void {
    dispatch('close', values)
  }

  function getOnChange (id: ContextId): (val: any) => void {
    return (val: any) => {
      values[id] = val
      values = values
    }
  }
</script>

<Card
  width={'small'}
  on:close
  label={plugin.string.Result}
  canSave={Object.values(values).filter((v) => v != null).length === results.length}
  okAction={save}
  hideClose
  okLabel={presentation.string.Save}
>
  <div class="grid">
    {#each results as result, i}
      {@const editor = getAttrEditor(result.type, h)}
      <span
        class="labelOnPanel"
        use:tooltip={{
          props: { text: result.name }
        }}
      >
        {result.name}
      </span>
      {#if editor}
        <div class="w-full">
          <Component
            is={editor}
            props={{
              label: plugin.string.Result,
              placeholder: plugin.string.Result,
              kind: 'ghost',
              size: 'large',
              width: '100%',
              justify: 'left',
              type: result.type,
              value: values[result._id],
              onChange: getOnChange(result._id),
              focus
            }}
          />
        </div>
      {/if}
    {/each}
  </div>
</Card>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 1rem;
    margin: 0.25rem 2rem 0;
    width: calc(100% - 4rem);
    height: min-content;
  }
</style>
