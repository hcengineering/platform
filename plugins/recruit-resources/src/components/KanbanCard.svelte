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
  import { UserInfo, Avatar } from '@anticrm/presentation'
  import { showPopup, Label, IconThread, ActionIcon, IconMoreH, IconFile } from '@anticrm/ui'
  import type { WithLookup } from '@anticrm/core'
  import type { Applicant } from '@anticrm/recruit'

  import EditCandidate from './EditCandidate.svelte'
  import EditApplication from './EditApplication.svelte'

  import { AttachmentPresenter } from '@anticrm/chunter-resources'
  import { formatName } from '@anticrm/contact'

  export let object: WithLookup<Applicant>
  export let draggable: boolean

  function showCandidate() {
    showPopup(EditCandidate, { _id: object.candidate }, 'full')
  }

  function showApplication() {
    showPopup(EditApplication, { _id: object._id }, 'full')
  }
</script>

<div class="card-container" {draggable} class:draggable on:dragstart on:dragend>
  <div class="content">
    <div class="flex-row-center">
      <Avatar size={'medium'} />
      <div class="flex-col ml-2">
        <div class="fs-title"><Label label={formatName(object.$lookup?.candidate?.name)} /></div>
        <div class="fs-subtitle"><Label label={formatName(object.$lookup?.candidate?.title)} /></div>
      </div>
    </div>
    <ActionIcon label={'More...'} icon={IconMoreH} size={'small'} />
  </div>
  <div class="flex-between">
    <div class="flex-row-center">
      <div class="sm-tool-icon step-lr75" on:click={showApplication}>
        <span class="icon"><IconFile size={'small'} /></span>
        APP-542
      </div>
      {#if object.attachments && Object.keys(object.attachments).length > 0}
        <div class="step-lr75"><AttachmentPresenter value={object} /></div>
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
    background-color: rgba(222, 222, 240, .06);
    border-radius: .75rem;
    user-select: none;
    backdrop-filter: blur(10px);

    .content {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    &.draggable { cursor: grab; }
  }
</style>
