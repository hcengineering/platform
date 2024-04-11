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
  import type { Schema } from '@hcengineering/schema'
  import DynamicSchemaValueEditor from './DynamicSchemaValueEditor.svelte'
  import type { SchemaValueEditorSubmit } from '../types'

  type S = $$Generic<Schema>
  type V = $$Generic<any>

  export let schema: S
  export let value: V
  export let submit: SchemaValueEditorSubmit<V>
</script>

<div class="select-text">
  <DynamicSchemaValueEditor {schema} {value} {submit} />
</div>
