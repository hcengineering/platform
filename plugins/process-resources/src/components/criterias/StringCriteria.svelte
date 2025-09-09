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
  import { AnyAttribute } from '@hcengineering/core'
  import { Context, Process } from '@hcengineering/process'
  import { AnyComponent } from '@hcengineering/ui'
  import { Mode, Modes } from '../../query'
  import BaseCriteria from './BaseCriteria.svelte'

  export let readonly: boolean
  export let value: any
  export let process: Process
  export let context: Context
  export let attribute: AnyAttribute
  export let baseEditor: AnyComponent | undefined

  const modes: Mode[] = [Modes.Equal, Modes.StringContains, Modes.Exists]
</script>

<BaseCriteria {readonly} {value} {process} {context} {attribute} {baseEditor} {modes} on:change on:delete />
