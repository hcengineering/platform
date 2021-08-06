<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { ActionIcon } from '@anticrm/ui'
  import MoreH from './icons/MoreH.svelte'

  export let title: string = 'Company name'
</script>

<div class="navigator-header">
  <div class="title">
    <span>{title}</span>
    <div class="arrow">
      <ActionIcon icon={MoreH} size={'small'}/>
    </div>
  </div>
</div>

<style lang="scss">
  .navigator-header {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 72px;
    padding: 20px 28px;
    .title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      height: 32px;
      span {
        flex-grow: 1;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        font-size: 16px;
        font-weight: 500;
        line-height: 150%;
        color: var(--theme-caption-color);
        user-select: none;
      }
      .arrow {
        width: 16px;
        min-width: 16px;
        height: 16px;
        border-radius: 4px;
        margin-left: 16px;
      }
    }
  }
</style>