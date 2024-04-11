<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import type { Schema, SchemaTypeId } from '@hcengineering/schema'
  import { getClient } from '@hcengineering/presentation'
  import { Loading } from '@hcengineering/ui'
  import type { SchemaEditorSubmit } from '../types'
  import { initializeSchemaValue } from '../utils'
  import DynamicSchemaEditor from './DynamicSchemaEditor.svelte'
  import FormValueEditor from './SchemaValueEditor.svelte'

  type S = $$Generic<Schema>
  type V = $$Generic<any>

  export let schema: S
  export let submit: SchemaEditorSubmit<S>
  export let preview: boolean = false
  export let schemaTypes: SchemaTypeId[] = []

  const hierarchy = getClient().getHierarchy()
  let previewPromise: Promise<V> | null = null
  $: if (preview) {
    previewPromise = initializeSchemaValue(hierarchy, schema)
  }
</script>

<div class="select-text">
  {#if preview}
    {#await previewPromise}
      <Loading />
    {:then previewValue}
      <FormValueEditor {schema} value={previewValue} submit={submit === null ? null : async () => {}} />
    {/await}
  {:else}
    <DynamicSchemaEditor {schema} {submit} {schemaTypes} />
  {/if}
</div>
