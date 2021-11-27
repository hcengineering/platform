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
  import { AttachmentsPresenter } from '@anticrm/chunter-resources'
  import { formatName } from '@anticrm/contact'
  import type { WithLookup } from '@anticrm/core'
  import { Avatar } from '@anticrm/presentation'
  import type { Applicant } from '@anticrm/recruit'
  import { ActionIcon, IconMoreH, IconThread, Label, showPopup } from '@anticrm/ui'
  import ApplicationPresenter from './ApplicationPresenter.svelte'
  import EditCandidate from './EditCandidate.svelte'

  export let object: WithLookup<Applicant>
  export let draggable: boolean

  function showCandidate () {
    showPopup(EditCandidate, { _id: object.attachedTo }, 'full')
  }
</script>

<div class="card-container" {draggable} class:draggable on:dragstart on:dragend>
  <div class="content">
    <div class="flex-row-center">
      <Avatar avatar={object.$lookup?.attachedTo?.avatar} size={'medium'} />
      <div class="flex-col ml-2">
        <div class="fs-title over-underline" on:click={showCandidate}>
          <Label label={formatName(object.$lookup?.attachedTo?.name)} />
        </div>
        <div class="small-text">{object.$lookup?.attachedTo?.title ?? ''}</div>
      </div>
    </div>
    <ActionIcon label={'More...'} icon={IconMoreH} size={'small'} />
  </div>
  <div class="flex-between">
    <div class="flex-row-center">
      <div class="sm-tool-icon step-lr75">
        <ApplicationPresenter value={object} />
      </div>
      {#if object.attachments && Object.keys(object.attachments).length > 0}
        <div class="step-lr75"><AttachmentsPresenter value={object} /></div>
      {/if}
      <div class="sm-tool-icon step-lr75">
        <span class="icon"><IconThread size={'small'} /></span>
        5
      </div>
    </div>
    <Avatar size={'x-small'} />
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
