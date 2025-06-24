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
  import presentation, { Card } from '@hcengineering/presentation'
  import { ProcessFunction } from '@hcengineering/process'
  import { StringEditor } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import process from '../../plugin'
  import { Label } from '@hcengineering/ui'

  export let func: ProcessFunction
  export let props: Record<string, any> = {}

  let search: string = props?.search ?? ''
  let replacement: string = props?.replacement ?? ''

  const dispatch = createEventDispatcher()

  function save (): void {
    dispatch('close', { search, replacement })
  }
</script>

<Card on:close width={'x-small'} label={func.label} canSave okAction={save} okLabel={presentation.string.Save}>
  <div class="grid">
    <Label label={process.string.Search} />
    <StringEditor
      bind:value={search}
      size={'large'}
      placeholder={process.string.Search}
      kind={'regular'}
      justify={'left'}
      width={'100%'}
    />
    <Label label={process.string.Replacement} />
    <StringEditor
      bind:value={replacement}
      size={'large'}
      placeholder={process.string.Replacement}
      kind={'regular'}
      justify={'left'}
      width={'100%'}
    />
  </div>
</Card>

<style lang="scss">
  .grid {
    display: grid;
    width: 100%;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(1rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.25rem;
    column-gap: 1rem;
    height: min-content;
  }
</style>
