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
  import { Type } from '@hcengineering/core'
  import { Process } from '@hcengineering/process'
  import { DropdownIntlItem, DropdownLabelsIntl, Label } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import ResultFieldTypeEditor from './ResultFieldTypeEditor.svelte'
  import ResultTypeEditor from './ResultTypeEditor.svelte'

  export let process: Process
  export let type: Type<any> | null | undefined
  export let key: string | undefined

  enum Modes {
    Attribute = 'attribute',
    Context = 'context'
  }

  const items: DropdownIntlItem[] = [
    {
      id: Modes.Attribute,
      label: plugin.string.Attribute
    },
    {
      id: Modes.Context,
      label: plugin.string.Context
    }
  ]

  let selected: Modes = key !== undefined || type == null ? Modes.Attribute : Modes.Context
</script>

<span class="label">
  <Label label={plugin.string.For} />
</span>
<DropdownLabelsIntl label={plugin.string.For} {items} size={'large'} width={'100%'} bind:selected />
{#if selected === Modes.Attribute}
  <ResultFieldTypeEditor {process} bind:key bind:type on:change />
{:else}
  <ResultTypeEditor bind:type on:change />
{/if}
