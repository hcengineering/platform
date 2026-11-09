<!--
//
// Copyright © 2026 TraceX SAS.
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
  import DropdownLabelsIntl from '../components/DropdownLabelsIntl.svelte'
  import ui from '../plugin'
  import type { DropdownIntlItem } from '../types'

  type Mode = 'first' | 'second'
  const items: Array<DropdownIntlItem<Mode>> = [
    { id: 'first', label: ui.string.Today },
    { id: 'second', label: ui.string.Yesterday }
  ]
  let mode: Mode = 'first'
  let single: string | number = ''
  let multiple: Array<string | number> = []
  let modes: Mode[] = []

  function selectMode (event: CustomEvent<Mode>): void {
    mode = event.detail
  }

  function selectSingle (event: CustomEvent<string | number>): void {
    single = event.detail
  }

  function selectMultiple (event: CustomEvent<Array<string | number>>): void {
    multiple = event.detail
  }

  function selectModes (event: CustomEvent<Mode[]>): void {
    modes = event.detail
  }
</script>

<!-- Compile-time coverage for inferred scalar, enum and multiselect events. -->
<DropdownLabelsIntl {items} shouldUpdateUndefined={false} on:selected={selectSingle} />
<DropdownLabelsIntl {items} selected={mode} on:selected={selectMode} />
<DropdownLabelsIntl {items} shouldUpdateUndefined={false} on:selected={selectMode} />
<DropdownLabelsIntl {items} multiselect shouldUpdateUndefined={false} on:selected={selectMultiple} />
<DropdownLabelsIntl {items} multiselect selected={modes} on:selected={selectModes} />
<output>{single} {multiple.join(',')}</output>
