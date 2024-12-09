<script lang="ts">
  import { Room, RoomLanguage } from '@hcengineering/love'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  import RoomLanguageComponent from './RoomLanguage.svelte'
  import {
    Button,
    type ButtonKind,
    type ButtonSize,
    DropdownIntlItem,
    DropdownLabelsPopupIntl,
    eventToHTMLElement,
    showPopup
  } from '@hcengineering/ui'
  import { languagesDisplayData } from '../types'
  import LanguageIcon from './LanguageIcon.svelte'

  export let value: RoomLanguage = 'en'
  export let object: Room | undefined = undefined
  export let onChange: (value: any) => void
  export let disabled: boolean = false
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'

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
        onChange(value)

        shown = false
      }
    })
  }
</script>

{#if object}
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
      <div class="pointer-events-none"><RoomLanguageComponent room={object} withLabel /></div>
    </svelte:fragment>
  </Button>
{/if}
