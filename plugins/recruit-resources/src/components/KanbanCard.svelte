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
  import { UserInfo } from '@anticrm/presentation'
  import { ActionIcon } from '@anticrm/ui'
  import IconWithLabel from './IconWithLabel.svelte'
  import Tag from './Tag.svelte'
  import File from './icons/File.svelte'
  import MoreH from './icons/MoreH.svelte'

  interface ICard {
    _id: number
    firstName: string
    lastName: string
    description: string
    state: number
  }

  export let card: ICard
  export let draggable: boolean

</script>

<div class="card-container" {draggable} class:draggable on:dragstart on:dragend>
  <div class="header">
    <UserInfo value={{firstName: card.firstName, lastName: card.lastName }} subtitle={'Candidate'} size={28} />
    <ActionIcon icon={MoreH} label={'More..'} direction={'left'} />
  </div>
  <div class="content">
    <IconWithLabel icon={File} label={'Team Interview'} />
    <div class="description">{card.description}</div>
    <div class="tags">
      <Tag icon={File} label={'Application'} />
    </div>
  </div>
</div>

<style lang="scss">
  .card-container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    background-color: var(--theme-button-bg-hovered);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 12px;
    user-select: none;

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      width: 100%;
      min-height: 60px;
      background-color: var(--theme-button-bg-focused);
      border-radius: 11px 11px 0 0;
    }
    .content {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      padding: 16px;

      .description {
        margin-top: 8px;
      }
      .tags {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }
    }

    &.draggable {
      cursor: grab;
    }
  }
</style>
