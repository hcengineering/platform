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
  import { createEventDispatcher, ComponentType } from 'svelte'

  import { Class, DocumentQuery, FindOptions, Ref, Space } from '@hcengineering/core'
  import { Asset, IntlString } from '@hcengineering/platform'
  import { getPlatformColorDef, getPlatformColorForTextDef, IconWithEmoji, themeStore } from '@hcengineering/ui'
  import {
    AnySvelteComponent,
    Button,
    ButtonKind,
    ButtonSize,
    ButtonShape,
    eventToHTMLElement,
    getEventPositionElement,
    getFocusManager,
    IconFolder,
    Label,
    showPopup,
    TooltipAlignment
  } from '@hcengineering/ui'
  import view, { IconProps } from '@hcengineering/view'

  import SpacesPopup from './SpacesPopup.svelte'
  import { ObjectCreate } from '../types'
  import { getClient } from '../utils'

  export let _class: Ref<Class<Space>>
  export let spaceQuery: DocumentQuery<Space> | undefined = { archived: false }
  export let spaceOptions: FindOptions<Space> | undefined = {}
  export let label: IntlString
  export let value: Ref<Space> | undefined
  export let focusIndex = -1
  export let focus = false
  export let create: ObjectCreate | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'large'
  export let itemSize: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let shape: ButtonShape = undefined
  export let width: string | undefined = undefined
  export let allowDeselect = false
  export let component: AnySvelteComponent | undefined = undefined
  export let componentProps: any | undefined = undefined
  export let autoSelect = true
  export let readonly = false
  export let iconWithEmoji: AnySvelteComponent | Asset | ComponentType | undefined = view.ids.IconWithEmoji
  export let defaultIcon: AnySvelteComponent | Asset | ComponentType = IconFolder
  export let findDefaultSpace: (() => Promise<Space | undefined>) | undefined = undefined

  let selected: (Space & IconProps) | undefined

  const client = getClient()
  const dispatch = createEventDispatcher()

  const mgr = getFocusManager()
  async function updateSelected (value: Ref<Space> | undefined) {
    selected = value !== undefined ? await client.findOne(_class, { ...(spaceQuery ?? {}), _id: value }) : undefined

    if (selected === undefined && autoSelect) {
      selected = (await findDefaultSpace?.()) ?? (await client.findOne(_class, { ...(spaceQuery ?? {}) }))
      if (selected !== undefined) {
        value = selected._id ?? undefined
        dispatch('change', value)
        dispatch('space', selected)
      }
    }
  }

  $: updateSelected(value)

  const showSpacesPopup = (ev: MouseEvent) => {
    if (readonly) {
      return
    }
    showPopup(
      SpacesPopup,
      {
        _class,
        label,
        size: itemSize,
        allowDeselect,
        spaceOptions: { ...(spaceOptions ?? {}), sort: { ...(spaceOptions?.sort ?? {}), modifiedOn: -1 } },
        selected: selected?._id,
        spaceQuery,
        create,
        component,
        componentProps,
        iconWithEmoji,
        defaultIcon
      },
      !$$slots.content ? eventToHTMLElement(ev) : getEventPositionElement(ev),
      (result) => {
        if (result !== undefined) {
          value = result?._id ?? undefined
          dispatch('change', value)
          mgr?.setFocusPos(focusIndex)
        }
      }
    )
  }
</script>

{#if $$slots.content}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div id="space.selector" class="w-full h-full flex-streatch" on:click={showSpacesPopup}>
    <slot name="content" />
  </div>
{:else}
  <Button
    id="space.selector"
    {focus}
    {shape}
    disabled={readonly}
    {focusIndex}
    icon={selected?.icon === iconWithEmoji && iconWithEmoji ? IconWithEmoji : selected?.icon ?? defaultIcon}
    iconProps={selected?.icon === iconWithEmoji && iconWithEmoji
      ? { icon: selected?.color }
      : {
          fill:
            selected?.color !== undefined
              ? getPlatformColorDef(selected?.color, $themeStore.dark).icon
              : getPlatformColorForTextDef(selected?.name ?? '', $themeStore.dark).icon
        }}
    {size}
    {kind}
    {justify}
    {width}
    notSelected={value == null}
    showTooltip={{ label, direction: labelDirection }}
    on:click={showSpacesPopup}
  >
    <span slot="content" class="overflow-label disabled text">
      {#if selected}{selected.name}{:else}<Label {label} />{/if}
    </span>
  </Button>
{/if}
