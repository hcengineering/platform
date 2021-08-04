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
  import type { IntlString } from '@anticrm/platform'
  import CheckBoxWithLabel from './CheckBoxWithLabel.svelte'
  import Label from './Label.svelte'
  import Add from './icons/Add.svelte'

  export let label: IntlString
  export let items: Array<Object> = [
    { id: 0, label: '15 minute phone call', done: true },
    { id: 1, label: 'Follow up email', done: false },
    { id: 2, label: 'First round interview', done: false },
    { id: 3, label: 'Follow up email', done: false },
    { id: 4, label: 'Second round interview', done: false },
    { id: 5, label: 'Third round interview', done: false },
  ]
  export let editable: boolean = false
</script>

<div class="checkbox-list">
  {#each items as item}
    <div class="list-item"><CheckBoxWithLabel bind:label={item.label} bind:checked={item.done} {editable} /></div>
  {/each}
  <div class="add-item"
    on:click={() => {
      items.push({ id: Date.now(), label: 'New item', done: false })
      items = items
    }}
  >
    <div class="icon"><Add /></div>
    <div class="label"><Label {label} /></div>
  </div>
</div>

<style lang="scss">
  .checkbox-list {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    margin: 0 16px;
    .list-item + .list-item {
      margin-top: 20px;
    }

    .add-item {
      display: flex;
      align-items: center;
      margin-top: 20px;
      cursor: pointer;

      .icon {
        width: 16px;
        height: 16px;
        opacity: .6;
      }
      .label {
        margin-left: 16px;
        color: var(--theme-content-color);
      }

      &:hover {
        .icon {
          opacity: 1;
        }
        .label {
          color: var(--theme-caption-color);
        }
      }
    }
  }
</style>
