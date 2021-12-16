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
  import { ActionIcon, IconMoreH, showPopup } from '@anticrm/ui'
  import { ContextMenu } from '@anticrm/view-resources'
  import lead from '../plugin'
  import { EditTask } from '@anticrm/task-resources'

  export let object: WithLookup<Lead>
  export let draggable: boolean

  function showMenu (ev?: Event): void {
    showPopup(ContextMenu, { object }, (ev as MouseEvent).target as HTMLElement)
  }

  function showLead () {
    showPopup(EditTask, { _id: object._id }, 'full')
  }
</script>

<div class="card-container" {draggable} class:draggable on:dragstart on:dragend>
  <div class="content">
    <div class="flex-row-center">
      <div class="flex-col ml-2">
        <div class="fs-title cursor-pointer" on:click={showLead}>{object.title}</div>
      </div>
    </div>
  </div>
  <div class="flex-between">
    {#if object.$lookup?.customer}
      <ContactPresenter value={object.$lookup?.customer} />
    {/if}
    <div class="flex-row-center">
      {#if (object.attachments ?? 0) > 0}
        <div class="step-lr75"><AttachmentsPresenter value={object} /></div>
      {/if}
      {#if (object.comments ?? 0) > 0}
        <div class="step-lr75"><CommentsPresenter value={object} /></div>
      {/if}
      <div class="step-lr75">
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
  </div>
</div>

<style lang="scss">
  .card-container {
    display: flex;
    flex-direction: column;
    padding: 1rem 1.25rem;
    background-color: rgba(222, 222, 240, 0.06);
    border-radius: 0.75rem;
    user-select: none;
    backdrop-filter: blur(10px);

    .content {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    &.draggable {
      cursor: grab;
    }
  }
</style>
