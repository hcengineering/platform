<!--
//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
-->
<script lang="ts">
  import type { Class, Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import presentation, { Card } from '@hcengineering/presentation'
  import textEditor from '@hcengineering/text-editor'
  import { Component, Loading } from '@hcengineering/ui'
  import type { BuildModelKey, Viewlet } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'

  export let _class: Ref<Class<Doc>>
  export let config: Array<string | BuildModelKey> | undefined = undefined
  export let documentIds: string[]
  export let query: DocumentQuery<Doc> | undefined = undefined
  export let viewlet: Viewlet | undefined = undefined
  export let viewletWithLookup: any | undefined = undefined

  const dispatch = createEventDispatcher()

  // Build query from documentIds if available (preserves order), otherwise use provided query
  let tableQuery: DocumentQuery<Doc>
  $: tableQuery = documentIds.length > 0 ? { _id: { $in: documentIds as any[] } } : (query ?? {})

  // Use config from viewlet if available, otherwise use metadata config
  // RelationshipTable doesn't use viewlets, so config comes directly from metadata
  // Ensure config is never empty - use default empty string key for default presenter
  $: viewletConfig = viewlet?.config
  $: tableConfig =
    viewletConfig !== undefined && viewletConfig.length > 0
      ? viewletConfig
      : config !== undefined && config.length > 0
        ? config
        : ['']

  // Get component from viewlet descriptor lookup
  $: viewletComponent = viewletWithLookup?.$lookup?.descriptor?.component

  function handleClose (): void {
    dispatch('close')
  }
</script>

<Card
  label={textEditor.string.SeeOriginalData}
  fullSize={true}
  canSave={true}
  okLabel={presentation.string.Ok}
  okAction={handleClose}
  onCancel={handleClose}
  on:close={handleClose}
>
  <div class="original-table-container">
    {#if viewletComponent}
      <Component
        is={viewletComponent}
        props={{
          _class,
          config: tableConfig,
          query: tableQuery,
          totalQuery: tableQuery,
          options: viewlet?.options,
          readonly: true,
          viewlet,
          viewOptions: viewlet?.viewOptions,
          viewOptionsConfig: viewlet?.viewOptions?.other
        }}
      />
    {:else}
      <Loading />
    {/if}
  </div>
</Card>

<style lang="scss">
  .original-table-container {
    padding: 1rem;
    overflow: auto;
    max-height: 80vh;
  }
</style>
