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
  import { Class, Ref, Space } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { translate } from '@hcengineering/platform'
  import type { ButtonKind, ButtonSize, TooltipAlignment } from '@hcengineering/ui'
  import { showPopup, Button } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation, { SpacesMultiPopup } from '..'
  import { themeStore } from '@hcengineering/ui'

  export let selectedItems: Ref<Space>[] = []
  export let _classes: Ref<Class<Space>>[] = []
  export let label: IntlString

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined

  const dispatch = createEventDispatcher()

  async function addSpace (evt: Event): Promise<void> {
    showPopup(
      SpacesMultiPopup,
      {
        _classes,
        label,
        selectedSpaces: selectedItems
      },
      evt.target as HTMLElement,
      () => {},
      (result) => {
        if (result !== undefined) {
          selectedItems = result
          dispatch('update', selectedItems)
        }
      }
    )
  }
</script>

<Button
  label={selectedItems.length === 0 ? presentation.string.Spaces : undefined}
  width={width ?? 'min-content'}
  {kind}
  {size}
  {justify}
  on:click={addSpace}
  showTooltip={{ label, direction: labelDirection }}
>
  <svelte:fragment slot="content">
    {#if selectedItems.length > 0}
      <div class="flex-row-center flex-nowrap">
        {#await translate(presentation.string.NumberSpaces, { count: selectedItems.length }, $themeStore.language) then text}
          <span class="overflow-label disabled ml-1-5">{text}</span>
        {/await}
      </div>
    {/if}
  </svelte:fragment>
</Button>
