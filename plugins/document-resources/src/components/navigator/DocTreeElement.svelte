<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Document } from '@hcengineering/document'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import type { Action, AnySvelteComponent } from '@hcengineering/ui'
  import { IconMoreH, Menu, navigate, showPopup, NavItem, ButtonIcon } from '@hcengineering/ui'
  import { getDocumentLink } from '../../utils'
  import view from '@hcengineering/view'

  export let doc: Document
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: Record<string, any> | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let selected: boolean = false
  export let isFold: boolean = false
  export let empty: boolean = false
  export let shouldTooltip: boolean = false
  export let level: number = 0
  export let actions: Action[] = []
  export let moreActions: (originalEvent?: MouseEvent) => Promise<Action[]> | undefined = async () => []
  export let forciblyСollapsed: boolean = false

  let hovered: boolean = false
  async function onMenuClick (ev: MouseEvent): Promise<void> {
    showPopup(Menu, { actions: await moreActions(ev), ctx: doc._id }, ev.target as HTMLElement, () => {
      hovered = false
    })
    hovered = true
  }

  function selectDocument (): void {
    const loc = getDocumentLink(doc)
    navigate(loc)
  }

  const dispatch = createEventDispatcher()
</script>

<NavItem
  _id={doc._id}
  {icon}
  {iconProps}
  {label}
  {title}
  {isFold}
  {level}
  {empty}
  {selected}
  showMenu={hovered}
  {shouldTooltip}
  {forciblyСollapsed}
  on:click={() => {
    selectDocument()
    dispatch('click')
  }}
>
  <svelte:fragment slot="actions">
    {#each actions as action}
      {#if action.icon}
        <ButtonIcon
          icon={action.icon}
          kind={'tertiary'}
          size={'extra-small'}
          dataId={action.label}
          tooltip={{ label: action.label, direction: 'top' }}
          on:click={(evt) => action.action({}, evt)}
        />
      {/if}
    {/each}
    <ButtonIcon
      icon={IconMoreH}
      kind={'tertiary'}
      size={'extra-small'}
      pressed={hovered}
      dataId={'btnDocMore'}
      tooltip={{ label: view.string.MoreActions, direction: 'top' }}
      on:click={onMenuClick}
    />
  </svelte:fragment>
  <svelte:fragment slot="dropbox">
    <slot />
  </svelte:fragment>
</NavItem>
