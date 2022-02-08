<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import { formatName } from '@anticrm/contact'
  import type { WithLookup } from '@anticrm/core'
  import { Avatar } from '@anticrm/presentation'
  import type { Applicant } from '@anticrm/recruit'
  import { ActionIcon, IconMoreH, showPanel } from '@anticrm/ui'
  import view from '@anticrm/view'
  import ApplicationPresenter from './ApplicationPresenter.svelte'

  export let object: WithLookup<Applicant>
  export let draggable: boolean

  function showCandidate () {
    showPanel(view.component.EditDoc, object.attachedTo, object.attachedToClass, 'full')
  }
</script>

<div class="card-container" {draggable} class:draggable on:dragstart on:dragend>
  <div class="flex-between mb-3">
    <Avatar avatar={object.$lookup?.attachedTo?.avatar} size={'medium'} />
    <div class="flex-grow flex-col min-w-0 ml-2">
      <div class="fs-title over-underline lines-limit-2" on:click={showCandidate}>
        {formatName(object.$lookup?.attachedTo?.name)}
      </div>
      <div class="text-sm lines-limit-2">{object.$lookup?.attachedTo?.title ?? ''}</div>
    </div>
    <div class="tool"><ActionIcon label={undefined} icon={IconMoreH} size={'small'} /></div>
  </div>
  <div class="flex-between">
    <div class="flex-row-center">
      <div class="sm-tool-icon step-lr75">
        <ApplicationPresenter value={object} />
      </div>
      {#if (object.attachments ?? 0) > 0}
        <div class="step-lr75"><AttachmentsPresenter value={object} /></div>
      {/if}
      {#if (object.comments ?? 0) > 0}
        <div class="step-lr75"><CommentsPresenter value={object} /></div>
      {/if}
    </div>
    <Avatar avatar={object.$lookup?.assignee?.avatar} size={'x-small'} />
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

    &.draggable {
      cursor: grab;
    }
  }
  .tool {
    align-self: start;
  }
</style>
