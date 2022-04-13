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
  import { AttachmentsPresenter } from '@anticrm/attachment-resources'
  import { CommentsPresenter } from '@anticrm/chunter-resources'
  import { ContactPresenter } from '@anticrm/contact-resources'
  import type { WithLookup } from '@anticrm/core'
  import type { Lead } from '@anticrm/lead'
  import { ActionIcon, Component, IconMoreH, showPanel, showPopup } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { ContextMenu } from '@anticrm/view-resources'
  import lead from '../plugin'
  import notification from '@anticrm/notification'

  export let object: WithLookup<Lead>
  export let dragged: boolean

  function showMenu (ev?: Event): void {
    showPopup(ContextMenu, { object }, (ev as MouseEvent).target as HTMLElement)
  }

  function showLead () {
    showPanel(view.component.EditDoc, object._id, object._class, 'full')
  }
</script>

<div class="flex-col pt-2 pb-2 pr-4 pl-4">
  <div class="flex-between mb-4">
    <div class="flex-col">
      <div class="fs-title cursor-pointer" on:click={showLead}>{object.title}</div>
    </div>
    <div class="flex-row-center">
      <div class="mr-2">
        <Component is={notification.component.NotificationPresenter} props={{ value: object }} />
      </div>
      <ActionIcon
        label={lead.string.More}
        action={(evt) => {
          showMenu(evt)
        }}
        icon={IconMoreH}
        size={'small'}
      />
    </div>
  </div>
  <div class="flex-between">
    {#if object.$lookup?.attachedTo}
      <ContactPresenter value={object.$lookup.attachedTo} />
    {/if}
    <div class="flex-row-center">
      {#if (object.attachments ?? 0) > 0}
        <div class="step-lr75">
          <AttachmentsPresenter value={object} />
        </div>
      {/if}
      {#if (object.comments ?? 0) > 0}
        <div class="step-lr75">
          <CommentsPresenter value={object} />
        </div>
      {/if}
    </div>
  </div>
</div>
