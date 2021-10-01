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
  import { showPopup, Label, IconThread, IconAttachment } from '@anticrm/ui'
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
  <div class="card-bg" />
  <div class="content">
    <div class="flex-center">
      <div class="avatar">
        <Avatar size={'large'} />
      </div>
    </div>
    <div class="flex-col">
      <div class="name" on:click={showCandidate}>{formatName(object.$lookup?.candidate?.name)}</div>
      <div class="city">{object.$lookup?.candidate?.city}</div>
      <div class="tags">
        <div class="tag" on:click={showApplication}><Label label={'Application'} /></div>
        <!-- <div class="tag"><Label label={'Resume'} /></div> -->
      </div>
    </div>
  </div>
  <div class="footer">
    <Avatar size={'small'} />
    <div class="flex-row-center">
      <div class="flex-row-center caption-color tool">
        <!-- <span class="icon"><IconAttachment size={'small'} /></span>
        4 -->
        <AttachmentPresenter value={object} />
      </div>
      <div class="flex-row-center caption-color tool">
        <span class="icon"><IconThread size={'small'} /></span>
        5
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  @import '../node_modules/@anticrm/theme/styles/mixins.scss';

  .card-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    border-radius: .75rem;
    overflow: hidden;
    user-select: none;
    backdrop-filter: blur(30px);

    .content {
      display: flex;
      align-items: center;
      padding: 1.25rem;

      .avatar {
        position: relative;
        margin-right: 1rem;
        width: 5rem;
        height: 5rem;
        border-radius: 50%;

        &::after {
          content: '';
          @include bg-layer(transparent, .1);
          border: 2px solid #fff;
          border-radius: 50%;
        }
      }

      .name {
        margin: .25rem 0;
        font-weight: 500;
        font-size: 1rem;
        color: var(--theme-caption-color);
        cursor: pointer;
        &:hover { text-decoration: underline; }
      }
      .city {
        font-weight: 500;
        font-size: .75rem;
      }
      .tags {
        display: flex;
        margin-top: .5rem;

        .tag {
          position: relative;
          display: flex;
          align-items: center;
          padding: .375rem .5rem;
          font-weight: 500;
          font-size: .625rem;
          text-align: center;
          color: var(--theme-caption-color);
          cursor: pointer;

          &::after {
            content: '';
            @include bg-layer(#fff, .04);
            border-radius: .5rem;
          }
        }
        .tag + .tag { margin-left: .5rem; }
      }
    }
    .footer {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: .75rem 1.25rem;
      width: 100%;
      min-height: 3rem;
      &::after {
        content: '';
        @include bg-layer(#fff, .04);
        z-index: -1;
      }
      .tool .icon {
        margin-right: .25rem;
        opacity: .4;
      }
      .tool + .tool { margin-left: .75rem; }
    }
    .card-bg {
      @include bg-layer(var(--theme-card-bg), .06);
      z-index: -1;
    }
    &.draggable { cursor: grab; }
  }

  :global(.card-container + .card-container) { margin-top: .75rem; }
</style>
