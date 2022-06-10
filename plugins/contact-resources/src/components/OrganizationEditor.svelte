<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Organization } from '@anticrm/contact'
  import { Ref } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { createQuery } from '@anticrm/presentation'
  import { DropdownPopup, Label, showPopup, Button } from '@anticrm/ui'
  import type { ButtonKind, ButtonSize } from '@anticrm/ui'
  import { ListItem } from '@anticrm/ui/src/types'
  import contact from '../plugin'
  import Company from './icons/Company.svelte'

  export let value: Ref<Organization> | undefined
  export let label: IntlString = contact.string.Organization
  export let onChange: (value: any) => void

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-content'

  const query = createQuery()

  query.query(contact.class.Organization, {}, (res) => {
    items = res.map((org) => {
      return {
        _id: org._id,
        label: org.name,
        image: org.avatar === null ? undefined : org.avatar
      }
    })
    if (value !== undefined) {
      selected = items.find((p) => p._id === value)
    }
  })

  let items: ListItem[] = []
  let selected: ListItem | undefined

  function setValue (res: ListItem | undefined): void {
    selected = res
    if (selected === undefined) {
      value = undefined
    } else {
      value = selected._id as Ref<Organization>
    }
    onChange(value)
  }

  let opened: boolean = false
  const icon = Company
  let tool: HTMLElement
</script>

<div class="clear-mins" bind:this={tool}></div>
<Button
  {justify}
  {width}
  {size}
  {kind}
  on:click={() => {
    if (!opened) {
      opened = true
      showPopup(DropdownPopup, { title: label, items, icon }, tool, (result) => {
        if (result) setValue(result)
        opened = false
      })
    }
  }}
>
  <svelte:fragment slot="content">
    {#if selected}
      <div class="flex-row-center pointer-events-none">
        <div class="icon"><Company size={'small'} /></div>
        <span class="overflow-label">{selected.label}</span>
      </div>
    {:else}
      <span class="overflow-label disabled"><Label {label} /></span>
    {/if}
  </svelte:fragment>
</Button>

<style lang="scss">
  .icon {
    margin-right: 0.5rem;
    padding: 0.25rem;
    color: var(--accent-color);
    background-color: var(--avatar-bg-color);
    border-radius: 50%;

    &:hover {
      color: var(--caption-color);
    }
  }
</style>
