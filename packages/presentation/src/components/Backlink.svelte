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
  import type { Backlink } from '@anticrm/chunter'
  import MessageViewer from './MessageViewer.svelte'

  import Avatar from './Avatar.svelte'

  export let backlink: Backlink

</script>

<div class="comment-message">
  <div class="avatar"><Avatar size={36} /></div>
  <div class="message">
    <div class="header">Rosamund Chen<span>July 28th</span></div>
    <div class="text"><MessageViewer message={backlink.message} /></div>
  </div>
</div>

<style lang="scss">
  .comment-message {
    display: flex;
    flex-wrap: nowrap;

    .avatar {
      width: 36px;
      height: 36px;
      margin-right: 16px;
    }
    .message {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      margin-right: 20px;

      .header {
        margin-bottom: 4px;
        font-weight: 500;
        font-size: 16px;
        line-height: 150%;
        color: var(--theme-caption-color);

        span {
          margin-left: 8px;
          font-weight: 400;
          font-size: 14px;
          color: var(--theme-content-dark-color);
        }
      }

      .text {
        font-size: 14px;
        line-height: 150%;
        color: var(--theme-content-color);
      }
    }
  }
</style>
