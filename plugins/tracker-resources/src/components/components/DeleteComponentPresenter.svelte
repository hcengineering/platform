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
  import view from '@hcengineering/view'
  import { Button, ButtonSize, ButtonKind, LabelAndProps, showPopup } from '@hcengineering/ui'
  import { getClient, MessageBox } from '@hcengineering/presentation'
  import type { Component } from '@hcengineering/tracker'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'

  export let value: Component
  export let kind: ButtonKind = 'regular'
  export let size: ButtonSize = 'medium'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-content'
  export let showTooltip: LabelAndProps | undefined = undefined

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function showConfirmationDialog () {
    showPopup(
      MessageBox,
      {
        label: tracker.string.RemoveComponentDialogClose,
        message: tracker.string.RemoveComponentDialogCloseNote
      },
      'top',
      (result?: boolean) => {
        if (result === true) {
          dispatch('close')
          removeComponent()
        }
      }
    )
  }

  async function removeComponent () {
    await client.remove(value)
  }
</script>

{#if value}
  <Button
    {kind}
    {size}
    {width}
    {justify}
    {showTooltip}
    icon={view.icon.Delete}
    on:click={() => showConfirmationDialog()}
  />
{/if}
