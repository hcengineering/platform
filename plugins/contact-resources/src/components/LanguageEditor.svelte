<script lang="ts">
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import {
    Button,
    type ButtonKind,
    type ButtonSize,
    DropdownIntlItem,
    DropdownLabelsPopupIntl,
    eventToHTMLElement,
    Label,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import LanguagePresenter from './LanguagePresenter.svelte'
  import { languagesDisplayData } from '../translation'
  import LanguageIcon from './LanguageIcon.svelte'
  import contact from '../plugin'

  export let value: string | undefined = undefined
  export let disabled: boolean = false
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'

  const dispatch = createEventDispatcher()

  let shown: boolean = false

  let items: DropdownIntlItem[] = []
  $: items = Object.entries(languagesDisplayData).map(([lang, data]) => ({
    id: lang,
    label: getEmbeddedLabel(data.label),
    icon: LanguageIcon,
    iconProps: { lang }
  }))

  function showLanguagesPopup (ev: MouseEvent): void {
    shown = true
    showPopup(DropdownLabelsPopupIntl, { items, selected: value }, eventToHTMLElement(ev), async (result) => {
      if (result != null && result !== '') {
        value = result
        dispatch('change', value)

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
      showLanguagesPopup(ev)
    }
  }}
>
  <svelte:fragment slot="content">
    <div class="pointer-events-none">
      {#if value != null && value !== ''}
        <LanguagePresenter lang={value} withLabel />
      {:else}
        <Label label={contact.string.SelectLanguage} />
      {/if}
    </div>
  </svelte:fragment>
</Button>
