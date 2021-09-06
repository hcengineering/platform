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
  import { ActionIcon, Label, IconMoreH, IconFile } from '@anticrm/ui'

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
    <UserInfo value={{firstName: card.firstName, lastName: card.lastName }} subtitle={'Candidate'} size={'small'} />
    <ActionIcon icon={IconMoreH} label={'More..'} direction={'left'} />
  </div>
  <div class="content">
    <div class="flex-row-center item">
      <IconFile size={'large'} />
      <span>Team Interview</span>
    </div>
    <div class="description">{card.description}</div>
    <div class="tags">
      <div class="tag">
        <IconFile size={'small'} />
        <span><Label label={'Application'} /></span>
      </div>
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
    border-radius: .75rem;
    user-select: none;

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: .75rem 1rem;
      width: 100%;
      min-height: 3.75rem;
      background-color: var(--theme-button-bg-focused);
      border-radius: .75rem .75rem 0 0;
    }
    .content {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      padding: 1rem;

      .item {
        font-weight: 500;
        font-size: 1rem;
        color: var(--theme-caption-color);
        span { margin-left: .5em; }
      }
      .description {
        margin-top: .5rem;
      }
      .tags {
        display: flex;
        margin-top: 1rem;

        .tag {
          display: flex;
          align-items: center;
          padding: .5rem .75rem;
          font-size: .75rem;
          text-align: center;
          background-color: var(--theme-bg-accent-color);
          color: var(--theme-caption-color);
          border-radius: .5rem;

          span { margin-left: .3em; }
        }
        .tag + .tag { margin-left: .75rem; }
      }
    }

    &.draggable {
      cursor: grab;
    }
  }

  :global(.card-container + .card-container) { margin-top: .75rem; }
</style>
