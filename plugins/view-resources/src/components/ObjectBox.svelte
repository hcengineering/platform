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
  import { Class, Doc, DocumentQuery, FindOptions, Hierarchy, Ref, mergeQueries } from '@hcengineering/core'
  import { Asset, IntlString } from '@hcengineering/platform'
  import presentation, { ObjectCreate, getClient } from '@hcengineering/presentation'
  import {
    ActionIcon,
    AnySvelteComponent,
    Button,
    ButtonKind,
    ButtonSize,
    Label,
    LabelAndProps,
    getEventPositionElement,
    getFocusManager,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import ObjectBoxPopup from './ObjectBoxPopup.svelte'
  import ObjectPresenter from './ObjectPresenter.svelte'
  import { openDoc } from '../utils'

  export let _class: Ref<Class<Doc>>
  export let excluded: Array<Ref<Doc>> | undefined = undefined
  export let options: FindOptions<Doc> | undefined = undefined
  export let docQuery: DocumentQuery<Doc> | undefined = undefined
  export let label: IntlString
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let placeholder: IntlString = presentation.string.Search
  export let placeholderIcon: Asset | undefined = undefined
  export let value: Ref<Doc> | null | undefined
  export let allowDeselect = false
  export let titleDeselect: IntlString | undefined = undefined
  export let readonly = false
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let focusIndex = -1
  export let showTooltip: LabelAndProps | undefined = undefined
  export let showNavigate = true
  export let id: string | undefined = undefined
  export let searchField: string = 'name'
  export let docProps: Record<string, any> = {}
  export let shouldShowAvatar = false
  export let autoSelect = false
  export let findDefault: (() => Promise<Doc | undefined>) | undefined = undefined
  export let groupBy = '_class'

  export let create: ObjectCreate | undefined = undefined

  const dispatch = createEventDispatcher()

  let selected: Doc | undefined
  let container: HTMLElement

  const client = getClient()

  async function updateSelected (
    _value: Ref<Doc> | null | undefined,
    docQuery: DocumentQuery<Doc> | undefined = undefined
  ): Promise<void> {
    selected = _value ? await client.findOne(_class, { ...(docQuery ?? {}), _id: _value }) : undefined

    if (typeof docQuery?._id === 'object' && _value != null) {
      const merged = mergeQueries({ _id: _value }, docQuery)
      if (typeof merged._id === 'object' && Object.keys(merged._id).length === 0) {
        // We do not have match.
        selected = undefined
      }
    }

    if (selected === undefined && autoSelect) {
      selected = (await findDefault?.()) ?? (await client.findOne(_class, { ...(docQuery ?? {}) }))
      if (selected !== undefined) {
        value = selected._id ?? undefined
        dispatch('change', value)
      }
    }
    if (selected !== undefined) {
      dispatch('object', selected)
    }
  }

  $: void updateSelected(value, docQuery)

  const mgr = getFocusManager()

  const _click = (ev: MouseEvent): void => {
    if (!readonly) {
      showPopup(
        ObjectBoxPopup,
        {
          _class,
          options,
          docQuery,
          ignoreObjects: excluded ?? [],
          icon,
          allowDeselect,
          selected: value,
          titleDeselect,
          placeholder,
          create,
          searchField,
          docProps,
          groupBy
        },
        !$$slots.content ? container : getEventPositionElement(ev),
        (result) => {
          if (result === null) {
            value = null
            selected = undefined
            dispatch('change', null)
          } else if (result !== undefined && result._id !== value) {
            value = result._id
            dispatch('change', value)
          }
          mgr?.setFocusPos(focusIndex)
        }
      )
    }
  }
</script>

<div {id} bind:this={container} class="min-w-0" class:w-full={width === '100%'} class:h-full={$$slots.content}>
  {#if $$slots.content}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="w-full h-full flex-streatch" on:click={_click}>
      <slot name="content" />
    </div>
  {:else}
    <Button
      {focusIndex}
      width={width ?? 'min-content'}
      icon={icon ?? value === undefined ? placeholderIcon : undefined}
      iconProps={{ size: kind === 'link' || kind === 'regular' ? 'small' : size }}
      {size}
      {kind}
      {justify}
      {showTooltip}
      on:click={_click}
      notSelected={!selected}
    >
      <span slot="content" class="overflow-label flex-grow" class:flex-between={showNavigate && selected}>
        <div
          class="disabled flex-row-center"
          style:width={showNavigate && selected
            ? `calc(${width ?? 'min-content'} - 1.5rem)`
            : `${width ?? 'min-content'}`}
        >
          {#if selected}
            <ObjectPresenter
              objectId={selected._id}
              _class={selected._class}
              value={selected}
              props={{ ...docProps, disabled: true, noUnderline: true, size: 'x-small', shouldShowAvatar }}
            />
          {:else}
            <Label {label} />
          {/if}
        </div>
        {#if selected && showNavigate}
          <ActionIcon
            icon={view.icon.Open}
            size={'small'}
            action={() => {
              if (selected) {
                void openDoc(client.getHierarchy(), selected)
              }
            }}
          />
        {/if}
      </span>
    </Button>
  {/if}
</div>
