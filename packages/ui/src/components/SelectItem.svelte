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
  import type { AnySvelteComponent, IPopupItem } from '../types'
  import Label from './Label.svelte'
  import PopupMenu from './PopupMenu.svelte'
  import PopupItem from './PopupItem.svelte'
  import ActionIcon from './ActionIcon.svelte'
  import Close from './icons/Close.svelte'

  export let component: AnySvelteComponent | undefined = undefined
  export let items: Array<IPopupItem>
  export let item: IPopupItem
  export let vAlign: 'top' | 'middle' | 'bottom' = 'bottom'
  export let hAlign: 'left' | 'center' | 'right' = 'left'
  export let margin: number = 16
  export let gap: number = 8

  let byTitle: boolean = (component) ? false : true
  let pressed: boolean = false

</script>

<PopupMenu {vAlign} {hAlign} {margin} bind:show={pressed}>
  <button class="btn" slot="trigger" style="margin: {gap/2}px;"
    on:click={(event) => {
      pressed = !pressed
      event.stopPropagation()
    }}
  >
    <div class="title">
      {#if byTitle }
        <Label label={item.title}/>
      {:else}
        <svelte:component this={component} {...item.props}/>
      {/if}
    </div>
    <div class="icon"><ActionIcon label={'Remove'} direction={'top'} icon={Close} size={'small'} action={async () => { item.selected = false }}/></div>
  </button>
  {#if byTitle }
    <PopupItem bind:title={item.title} selectable bind:selected={item.selected}/>
  {:else}
    <PopupItem bind:component={component} bind:props={item.props} selectable bind:selected={item.selected}/>
  {/if}
  {#each items.filter(i => !i.selected) as noItem}
    {#if byTitle }
      <PopupItem title={noItem.title} selectable bind:selected={noItem.selected} action={async () => {
        pressed = false
        item.selected = false
      }}/>
    {:else}
      <PopupItem component={component} props={noItem.props} selectable bind:selected={noItem.selected} action={async () => {
        pressed = false
        item.selected = false
      }}/>
    {/if}
  {/each}
</PopupMenu>

<style lang="scss">
  .btn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: nowrap;
    margin: 0;
    padding: 8px 12px;
    width: auto;
    height: 40px;
    background-color: var(--theme-button-bg-pressed);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 12px;
    outline: none;
    cursor: pointer;

    .title {
      flex-grow: 1;
      text-align: left;
      color: var(--theme-caption-color);
    }

    .icon {
      width: 16px;
      height: 16px;
      margin-left: 12px;
      opacity: .8;
    }

    &:hover {
      background-color: var(--theme-button-bg-pressed);
      border: 1px solid var(--theme-bg-accent-color);
      .icon {
        opacity: 1;
      }
    }
    &:focus {
      border: 1px solid var(--primary-button-focused-border);
      box-shadow: 0 0 0 3px var(--primary-button-outline);
      .icon {
        opacity: 1;
      }
    }
  }
</style>
