<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { ButtonKind, ButtonSize, DropdownIntlItem, DropdownLabelsIntl } from '@hcengineering/ui'
  import { DiffViewMode } from '@hcengineering/diffview'

  import diffview from '../plugin'

  export let selected: DiffViewMode | undefined
  export let kind: ButtonKind = 'link-bordered'
  export let size: ButtonSize = 'small'
  export let label = diffview.string.ViewMode

  const viewModeDropdownItems: DropdownIntlItem[] = [
    {
      id: 'unified',
      label: diffview.string.Unified
    },
    {
      id: 'split',
      label: diffview.string.Split
    }
  ]
</script>

<DropdownLabelsIntl {kind} {size} {label} items={viewModeDropdownItems} width={'6rem'} bind:selected on:selected />
