<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { ProductVersionState, productVersionStates } from '@hcengineering/products'
  import { Button, ButtonKind, ButtonSize, SelectPopup, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import products from '../../plugin'
  import { productVersionStateLabels } from '../../types'

  export let value: ProductVersionState
  export let readonly: boolean = false

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = 'min-content'
  export let focusIndex: number | undefined = undefined
  export let onChange: (value: ProductVersionState) => void = () => {}

  const dispatch = createEventDispatcher()

  $: statesInfo = productVersionStates.map((p) => {
    return {
      id: p,
      label: productVersionStateLabels[p],
      isSelected: value === p
    }
  })

  const handlePopupOpened = (event: MouseEvent): void => {
    event.stopPropagation()

    if (readonly) {
      return
    }

    showPopup(
      SelectPopup,
      { value: statesInfo, placeholder: products.string.ProductVersionState, searchable: true },
      eventToHTMLElement(event),
      changeState
    )
  }

  const changeState = async (newState: ProductVersionState | undefined): Promise<void> => {
    if (readonly || newState === undefined || value === newState) {
      return
    }

    value = newState
    dispatch('change', newState)
    onChange(newState)
  }
</script>

<Button
  showTooltip={readonly ? undefined : { label: products.string.ProductVersionState }}
  label={productVersionStateLabels[value]}
  {justify}
  {focusIndex}
  {width}
  {size}
  {kind}
  disabled={readonly}
  on:click={handlePopupOpened}
/>
