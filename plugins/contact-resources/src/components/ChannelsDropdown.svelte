<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import type { Channel, ChannelProvider } from '@anticrm/contact'
  import contact from '@anticrm/contact'
  import type { AttachedData, Doc, Ref, Timestamp } from '@anticrm/core'
  import type { Asset, IntlString } from '@anticrm/platform'
  import { AnyComponent, showPopup, Tooltip, Button, Menu, Label, closePopup } from '@anticrm/ui'
  import type { Action, ButtonKind, ButtonSize } from '@anticrm/ui'
  import presentation from '@anticrm/presentation'
  import { getChannelProviders } from '../utils'
  import ChannelsPopup from './ChannelsPopup.svelte'
  import ChannelEditor from './ChannelEditor.svelte'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
import { onDestroy } from 'svelte';

  export let value: AttachedData<Channel>[] | Channel | null
  export let editable = false
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let length: 'short' | 'full' = 'full'
  export let shape: 'circle' | undefined = undefined
  // export let reverse: boolean = false
  export let integrations: Set<Ref<Doc>> = new Set<Ref<Doc>>()

  const notificationClient = NotificationClientImpl.getClient()
  const lastViews = notificationClient.getLastViews()
  const dispatch = createEventDispatcher()

  let editMode = false

  interface Item {
    label: IntlString
    icon: Asset
    value: string
    presenter?: AnyComponent
    placeholder: IntlString
    provider: Ref<ChannelProvider>
    integration: boolean
    notification: boolean
  }

  function getProvider (
    item: AttachedData<Channel>,
    map: Map<Ref<ChannelProvider>, ChannelProvider>,
    lastViews: Map<Ref<Doc>, Timestamp>
  ): any | undefined {
    const provider = map.get(item.provider)
    if (provider) {
      const notification = (item as Channel)._id !== undefined ? isNew((item as Channel), lastViews) : false
      return {
        label: provider.label,
        icon: provider.icon as Asset,
        value: item.value,
        presenter: provider.presenter,
        placeholder: provider.placeholder,
        provider: provider._id,
        notification,
        integration: provider.integrationType !== undefined ? integrations.has(provider.integrationType) : false
      }
    } else {
      console.log('provider not found: ', item.provider)
    }
  }

  function isNew (item: Channel, lastViews: Map<Ref<Doc>, Timestamp>): boolean {
    const lastView = (item as Channel)._id !== undefined ? lastViews.get((item as Channel)._id) : undefined
    return lastView ? lastView < item.modifiedOn : (item.items ?? 0) > 0
  }

  async function update (value: AttachedData<Channel>[] | Channel | null, lastViews: Map<Ref<Doc>, Timestamp>) {
    if (value === null) {
      displayItems = []
      return
    }
    const result = []
    const map = await getChannelProviders()
    if (Array.isArray(value)) {
      for (const item of value) {
        const provider = getProvider(item, map, lastViews)
        if (provider !== undefined) {
          result.push(provider)
        }
      }
    } else {
      const provider = getProvider(value, map, lastViews)
      if (provider !== undefined) {
        result.push(provider)
      }
    }
    displayItems = result
    updateMenu()
  }

  $: if (value) update(value, $lastViews)

  let providers: Map<Ref<ChannelProvider>, ChannelProvider>
  let displayItems: Item[] = []
  let actions: Action[] = []
  let addBtn: HTMLButtonElement
  let btns: HTMLButtonElement[] = []

  function filterUndefined (channels: AttachedData<Channel>[]): AttachedData<Channel>[] {
    return channels.filter((channel) => channel.value !== undefined && channel.value.length > 0)
  }
  
  getChannelProviders().then(pr => providers = pr)

  const updateMenu = (): void => {
    actions = []
    providers.forEach(pr => {
      if (displayItems.filter(it => it.provider === pr._id).length == 0) {
        actions.push({
          icon: pr.icon ?? contact.icon.SocialEdit,
          label: pr.label,
          action: async () => {
            const provider = getProvider({ provider: pr._id, value: '' }, providers, $lastViews)
            if (provider !== undefined) {
              if (displayItems.filter(it => it.provider === pr._id).length === 0) {
                displayItems = [...displayItems, provider]
              }
            }
          }
        })
      }
    })
  }
  $: if (providers) updateMenu()

  const dropItem = (n: number): void => {
    displayItems = displayItems.filter((it, i) => i !== n)
  }
  const saveItems = (): void => {
    value = filterUndefined(displayItems)
    dispatch('change', value)
    updateMenu()
  }

  const editChannel = (channel: Item, n: number, ev: MouseEvent): void => {
    showPopup(
      ChannelEditor,
      { value: channel.value, placeholder: channel.placeholder },
      ev.target as HTMLElement,
      result => {
        if (result !== undefined) {
          if (result == null || result === '') dropItem(n)
          else displayItems[n].value = result
        } else if (displayItems[n].value === '') dropItem(n)
        saveItems()
        if (actions.length > 0 && addBtn) {
          if (result !== undefined) addBtn.click()
          else disableEdit()
        } else {
          disableEdit()
        }
      },
      result => {
        if (result != undefined) {
          if (result === 'left') {
            closePopup()
            if (displayItems[n].value === '') {
              dropItem(n)
              saveItems()
            }
            if (n === 0) addBtn.click()
            else btns[n - 1].click()
          } else if (result === 'right') {
            closePopup()
            if (displayItems[n].value === '') {
              dropItem(n)
              saveItems()
              if (n === displayItems.length) addBtn.click()
              else btns[n + 1].click()
            } else {
              if (n === displayItems.length - 1) addBtn.click()
              else btns[n + 1].click()
            }
          }
        }
      }
    )
  }
  const showMenu = (ev: MouseEvent): void => {
    showPopup(Menu, { actions }, ev.target as HTMLElement, (result) => {
      if (result === undefined) {
        disableEdit()
      }
    }, result => {
      if (result != undefined && displayItems.length > 0) {
        if (result === 'left') {
          closePopup()
          btns[displayItems.length - 1].click()
        } else if (result === 'right') {
          closePopup()
          btns[0].click()
        }
      }
    })
  }
  let copied: boolean = false
  let div: HTMLDivElement

  function listener (e: MouseEvent): void {
    if (e.target !== null && !div.contains(e.target as Node)) {
      disableEdit()
    }
  }

  function enableEdit () {
    window.addEventListener('click', listener)
    editMode = true
  }

  function disableEdit () {
    window.removeEventListener('click', listener)
    editMode = false
  }

  onDestroy(() => {
    window.removeEventListener('click', listener)
  })
</script>
<div
  bind:this={div}
  class="{displayItems.length === 0 ? 'clear-mins' : 'buttons-group'} {kind === 'no-border' ? 'xsmall-gap' : 'xxsmall-gap'}"
  class:short={displayItems.length > 4 && length === 'short'}
>
  {#each displayItems as item, i}
    {#if item.value === ''}
      <Button
        icon={item.icon} {kind} {size} {shape} click={item.value === ''}
        on:click={(ev) => { if (editMode) editChannel(item, i, ev) }}
      />
    {:else}
      <div class="tooltip-container">
        <div class="tooltip">{item.value}{#if copied}<span class="ml-1 text-sm dark-color">(copied)</span>{/if}</div>
        <Button
          bind:input={btns[i]}
          icon={item.icon} {kind} {size} {shape}
          highlight={item.integration || item.notification || editMode}
          on:click={(ev) => {
            if (editMode) {
              editChannel(item, i, ev)
            } else {
              dispatch('click', item)
              if (!copied) {
                navigator.clipboard.writeText(item.value)
                copied = true
                setTimeout(() => { copied = false }, 1000)
              }
            }
          }}
        />
      </div>
    {/if}
  {/each}
  {#if actions.length > 0 && editable}
    <Button
      bind:input={addBtn}
      icon={contact.icon.SocialEdit}
      highlight={editMode}
      label={editMode ? presentation.string.AddSocialLinks : presentation.string.EditSocialLinks}
      {kind} {size} {shape}
      on:click={editMode ? showMenu : enableEdit}
    />
  {/if}
</div>

<style lang="scss">
  .tooltip-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 0;
    min-height: 0;
    width: min-content;

    .tooltip {
      overflow: hidden;
      position: absolute;
      padding: .25rem .5rem;
      bottom: 100%;
      left: 50%;
      width: auto;
      min-width: 0;
      white-space: nowrap;
      text-overflow: ellipsis;
      background-color: var(--accent-bg-color);
      border: 1px solid var(--button-border-color);
      border-radius: .25rem;
      transform-origin: center center;
      transform: translate(-50%, -.25rem) scale(.9);
      opacity: 0;
      box-shadow: var(--accent-shadow);
      transition-property: transform, opacity;
      transition-duration: .15s;
      transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: none;
    }
    &:hover .tooltip {
      transform: translate(-50%, -.5rem) scale(1);
      opacity: 1;
    }
  }
</style>
