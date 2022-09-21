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
  import type { IntlString } from '@hcengineering/platform'
  import {
    Label,
    showPopup,
    IconFolder,
    Button,
    eventToHTMLElement,
    getFocusManager,
    TooltipAlignment
  } from '@hcengineering/ui'
  import EnumPopup from './EnumPopup.svelte'

  import core, { Ref, Class, DocumentQuery, Enum } from '@hcengineering/core'
  import { ObjectCreate } from '@hcengineering/presentation'

  export let label: IntlString
  export let value: Enum | undefined
  export let focusIndex = -1
  export let focus = false
  export let create: ObjectCreate | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined

  const _class: Ref<Class<Enum>> = core.class.Enum
  const query: DocumentQuery<Enum> = {}

  const mgr = getFocusManager()

  const handleClick = (ev: any) => {
    showPopup(
      EnumPopup,
      {
        _class,
        label,
        options: { sort: { modifiedOn: -1 } },
        selected: value?._id,
        spaceQuery: query,
        create
      },
      eventToHTMLElement(ev),
      (result) => {
        if (result) {
          value = result
          mgr?.setFocusPos(focusIndex)
        }
      }
    )
  }
</script>

<Button
  {focus}
  {focusIndex}
  icon={IconFolder}
  size={'small'}
  kind={'no-border'}
  showTooltip={{ label, direction: labelDirection }}
  on:click={handleClick}
>
  <span slot="content" class="text-sm overflow-label disabled">
    {#if value}{value.name}{:else}<Label {label} />{/if}
  </span>
</Button>
