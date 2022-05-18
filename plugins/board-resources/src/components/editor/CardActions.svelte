<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Card } from '@anticrm/board'
  import { getClient } from '@anticrm/presentation'
  import { Button, IconAttachment, Label, showPopup } from '@anticrm/ui'
  import type { Action } from '@anticrm/view'
  import { getActions, invokeAction } from '@anticrm/view-resources'
  import AddChecklist from '../popups/AddChecklist.svelte'
  import AttachmentPicker from '../popups/AttachmentPicker.svelte'
  import plugin from '../../plugin'
  import { getPopupAlignment } from '../../utils/PopupUtils'

  export let value: Card
  const client = getClient()

  let topActions: Action[] = []
  let toolsActions: Action[] = []
  async function fetch () {
    const result = await getActions(client, value, value._class)
    topActions = result.filter((action) => action.context.group === 'top')
    toolsActions = result.filter((action) => action.context.group !== 'top')
  }
  fetch()
  $: value.members && fetch()
  $: value.isArchived && fetch()
  $: !value.isArchived && fetch()
</script>

{#if value}
  <div class="flex-col flex-gap-3">
    <div class="flex-col flex-gap-1">
      <Label label={plugin.string.AddToCard} />
      {#each topActions as action}
        <Button
          icon={action.icon}
          label={action.label}
          kind="no-border"
          justify="left"
          on:click={(e) => {
            invokeAction(value, e, action.action, action.actionProps)
          }}
        />
      {/each}
      <Button
        icon={plugin.icon.Card}
        label={plugin.string.Checklist}
        kind="no-border"
        justify="left"
        on:click={(e) => {
          showPopup(AddChecklist, { value }, getPopupAlignment(e))
        }}
      />
      <Button
        icon={IconAttachment}
        label={plugin.string.Attachments}
        kind="no-border"
        justify="left"
        on:click={(e) => {
          showPopup(AttachmentPicker, { value }, getPopupAlignment(e))
        }}
      />
    </div>
    <div class="flex-col flex-gap-1">
      <Label label={plugin.string.Actions} />
      {#each toolsActions as action}
        <Button
          icon={action.icon}
          label={action.label}
          kind="no-border"
          justify="left"
          on:click={(e) => {
            invokeAction(value, e, action.action, action.actionProps)
          }}
        />
      {/each}
    </div>
  </div>
{/if}
