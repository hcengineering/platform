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
  import { EditBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'
  import presentation, { Card } from '@hcengineering/presentation'

  const dispatch = createEventDispatcher()
  export let existingNames: string[] = []
  export let value = ''

  $: canSave = !existingNames.includes(value)
  function save () {
    dispatch('close', value)
  }
</script>

<Card
  label={task.string.StatusPopupTitle}
  {canSave}
  okAction={save}
  okLabel={presentation.string.Save}
  on:close
  on:changeContent
>
  <EditBox focusIndex={1} bind:value placeholder={task.string.StatusName} kind={'large-style'} autoFocus fullSize />
  <svelte:fragment slot="error">
    {#if !canSave}
      <Label label={task.string.NameAlreadyExists} />
    {/if}
  </svelte:fragment>
</Card>
