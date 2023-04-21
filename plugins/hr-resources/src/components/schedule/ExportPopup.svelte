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
  import { Card } from '@hcengineering/presentation'
  import { createEventDispatcher } from 'svelte'
  import { DropdownLabelsIntl, Label } from '@hcengineering/ui'
  import hr from '../../plugin'

  const dispatch = createEventDispatcher()
  export let items = []

  let selectedSeparator = items[0].id
</script>

<Card
  label={hr.string.Export}
  okLabel={hr.string.Export}
  okAction={() => dispatch('close', selectedSeparator)}
  canSave
  on:close
>
  <div class="flex-row-center">
    <Label label={hr.string.ChooseSeparator} />
    <DropdownLabelsIntl {items} label={hr.string.Separator} bind:selected={selectedSeparator} />
  </div>
</Card>
