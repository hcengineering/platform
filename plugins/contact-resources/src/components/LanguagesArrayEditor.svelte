<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { Button, ButtonKind, ButtonSize, eventToHTMLElement, Label, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import LanguagePresenter from './LanguagePresenter.svelte'
  import LanguagesPopup from './LanguagesPopup.svelte'
  import contact from '../plugin'

  export let disabled = false
  export let selected: string[] = []

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'

  const dispatch = createEventDispatcher()

  let shown: boolean = false

  const handleOpen = (event: MouseEvent): void => {
    event.stopPropagation()
    event.preventDefault()

    if (disabled) return

    showPopup(LanguagesPopup, { selected }, eventToHTMLElement(event), undefined, async (result) => {
      if (result != null) {
        selected = result
        dispatch('change', selected)

        shown = false
      }
    })
  }
</script>

<Button
  {kind}
  {size}
  {justify}
  {width}
  {disabled}
  on:click={(ev) => {
    if (!shown && !disabled) {
      handleOpen(ev)
    }
  }}
>
  <svelte:fragment slot="content">
    <div class="pointer-events-none flex-gap-2 flex-presenter">
      {#if selected.length > 0}
        {#each selected as value}
          <LanguagePresenter lang={value} withLabel />
        {/each}
      {:else}
        <Label label={contact.string.SelectLanguages} />
      {/if}
    </div>
  </svelte:fragment>
</Button>
