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
  import { getClient } from '../utils'

  import {
    Label,
    showPopup,
    IconFolder,
    Button,
    eventToHTMLElement,
    getFocusManager,
    Tooltip,
    TooltipAlignment,
    ButtonKind,
    ButtonSize
  } from '@anticrm/ui'
  import SpacesPopup from './SpacesPopup.svelte'

  import type { Ref, Class, Space, DocumentQuery } from '@anticrm/core'
  import { createEventDispatcher } from 'svelte'
  import { ObjectCreate } from '../types'

  export let _class: Ref<Class<Space>>
  export let spaceQuery: DocumentQuery<Space> | undefined = { archived: false }
  export let label: IntlString
  export let value: Ref<Space> | undefined
  export let focusIndex = -1
  export let focus = false
  export let create: ObjectCreate | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let allowDeselect = false

  let selected: Space | undefined

  const client = getClient()
  const dispatch = createEventDispatcher()

  const mgr = getFocusManager()
  async function updateSelected (value: Ref<Space> | undefined) {
    selected = value !== undefined ? await client.findOne(_class, { ...(spaceQuery ?? {}), _id: value }) : undefined
  }

  $: updateSelected(value)

  const showSpacesPopup = (ev: MouseEvent) => {
    showPopup(
      SpacesPopup,
      {
        _class,
        label,
        allowDeselect,
        options: { sort: { modifiedOn: -1 } },
        selected,
        spaceQuery,
        create
      },
      eventToHTMLElement(ev),
      (result) => {
        if (result) {
          value = result._id
          dispatch('change', value)
          mgr?.setFocusPos(focusIndex)
        }
      }
    )
  }
</script>

<Tooltip {label} fill={false} direction={labelDirection}>
  <Button {focus} {focusIndex} icon={IconFolder} {size} {kind} {justify} {width} on:click={showSpacesPopup}>
    <span slot="content" class="overflow-label disabled text-sm">
      {#if selected}{selected.name}{:else}<Label {label} />{/if}
    </span>
  </Button>
</Tooltip>
