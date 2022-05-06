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
  import { AnyComponent, showPopup, Button, Menu, showTooltip, closeTooltip, eventToHTMLElement } from '@anticrm/ui'
  import type { Action, ButtonKind, ButtonSize } from '@anticrm/ui'
  import presentation from '@anticrm/presentation'
  import { getChannelProviders } from '../utils'
  import ChannelEditor from './ChannelEditor.svelte'
  import { NotificationClientImpl } from '@anticrm/notification-resources'

  export let value: AttachedData<Channel>[] | Channel | null
  export let editable: boolean = false
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let length: 'short' | 'full' = 'full'
  export let shape: 'circle' | undefined = undefined
  export let integrations: Set<Ref<Doc>> = new Set<Ref<Doc>>()

  const notificationClient = NotificationClientImpl.getClient()
  const lastViews = notificationClient.getLastViews()
  const dispatch = createEventDispatcher()

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
      const notification = (item as Channel)._id !== undefined ? isNew(item as Channel, lastViews) : false
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
    return lastView ? lastView < item.lastMessage : (item.items ?? 0) > 0
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
  const btns: HTMLButtonElement[] = []
  let anchor: HTMLElement

  function filterUndefined (channels: AttachedData<Channel>[]): AttachedData<Channel>[] {
    return channels.filter((channel) => channel.value !== undefined && channel.value.length > 0)
  }

  getChannelProviders().then((pr) => (providers = pr))

  const updateMenu = (): void => {
    actions = []
    providers.forEach((pr) => {
      if (displayItems.filter((it) => it.provider === pr._id).length === 0) {
        actions.push({
          icon: pr.icon ?? contact.icon.SocialEdit,
          label: pr.label,
          action: async () => {
            const provider = getProvider({ provider: pr._id, value: '' }, providers, $lastViews)
            if (provider !== undefined) {
              if (displayItems.filter((it) => it.provider === pr._id).length === 0) {
                displayItems = [...displayItems, provider]
              }
            }
          }
        })
      }
    })
  }
  $: if (providers) updateMenu()

  const dropItem = (n: number): Item[] => {
    return displayItems.filter((it, i) => i !== n)
  }
  const saveItems = (): void => {
    value = filterUndefined(displayItems)
    dispatch('change', value)
    updateMenu()
  }

  const showMenu = (ev: MouseEvent): void => {
    showPopup(Menu, { actions }, ev.target as HTMLElement)
  }

  const editChannel = (el: HTMLElement, n: number, item: Item): void => {
    showTooltip(
      undefined,
      el,
      undefined,
      ChannelEditor,
      { value: item.value, placeholder: item.placeholder, editable },
      anchor,
      (result) => {
        if (result.detail !== undefined) {
          if (result.detail === '') displayItems = dropItem(n)
          else displayItems[n].value = result.detail
          saveItems()
        }
      }
    )
  }
  const _focus = (ev: Event, n: number, item: Item): void => {
    const el = ev.target as HTMLButtonElement
    if (el) editChannel(el, n, item)
  }
</script>

<div
  bind:this={anchor}
  class="{displayItems.length === 0 ? 'clear-mins' : 'buttons-group'} {kind === 'no-border'
    ? 'xsmall-gap'
    : 'xxsmall-gap'}"
  class:short={displayItems.length > 4 && length === 'short'}
>
  {#each displayItems as item, i}
    <Button
      bind:input={btns[i]}
      icon={item.icon}
      {kind}
      {size}
      {shape}
      highlight={item.integration || item.notification}
      on:mousemove={(ev) => {
        _focus(ev, i, item)
      }}
      on:focus={(ev) => {
        _focus(ev, i, item)
      }}
      on:click={(ev) => {
        if (editable) editChannel(eventToHTMLElement(ev), i, item)
        else closeTooltip()
        dispatch('open', item)
      }}
    />
  {/each}
  {#if actions.length > 0 && editable}
    <Button
      bind:input={addBtn}
      icon={contact.icon.SocialEdit}
      label={displayItems.length === 0 ? presentation.string.AddSocialLinks : undefined}
      {kind}
      {size}
      {shape}
      on:click={showMenu}
    />
  {/if}
</div>
