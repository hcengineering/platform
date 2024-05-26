<!--
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
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import core from '@hcengineering/core'
  import { Card } from '@hcengineering/presentation'
  import { EditBox } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import drive from '../plugin'

  export let value: string | undefined

  const dispatch = createEventDispatcher()

  $: canSave = value !== undefined && value.trim().length > 0

  function handleOkAction (): void {
    dispatch('close', value?.trim())
  }
</script>

<Card label={drive.string.Rename} okLabel={view.string.Save} okAction={handleOkAction} {canSave} on:close>
  <EditBox bind:value placeholder={core.string.Name} autoFocus select />
</Card>
