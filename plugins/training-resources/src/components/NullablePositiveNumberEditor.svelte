<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { getEmbeddedLabel, type IntlString } from '@hcengineering/platform'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { EditBox, Label, showPopup, eventToHTMLElement, Button } from '@hcengineering/ui'
  import { EditBoxPopup } from '@hcengineering/view-resources'
  import { unlimitedAttempts } from './TrainingRequestMaxAttemptsPresenter.svelte'

  export let placeholder: IntlString = getEmbeddedLabel(unlimitedAttempts)
  export let value: number | null = null
  export let autoFocus: boolean = false
  export let onChange: (value: number | null) => void
  export let kind: ButtonKind = 'no-border'
  export let readonly = false
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'

  const shown: boolean = false

  function onEditBoxChange (event: Event): void {
    applyValue((event.target as HTMLInputElement).valueAsNumber)
  }

  function applyValue (valueAsNumber: number): void {
    let value: number | null = null
    if (Number.isFinite(valueAsNumber)) {
      value = Math.abs(Math.round(valueAsNumber))
      if (value === 0) {
        value = null
      }
    }
    onChange(value)
  }
</script>

{#if kind === 'regular' || kind === 'link'}
  <Button
    {kind}
    {size}
    {justify}
    {width}
    disabled={readonly}
    on:click={(ev) => {
      if (!shown && !readonly) {
        showPopup(EditBoxPopup, { value, format: 'number' }, eventToHTMLElement(ev), applyValue)
      }
    }}
  >
    <svelte:fragment slot="content">
      {#if value !== null && value !== undefined}
        <span class="overflow-label pointer-events-none">{value}</span>
      {:else}
        <span class="content-dark-color pointer-events-none"><Label label={placeholder} /></span>
      {/if}
    </svelte:fragment>
  </Button>
{:else if readonly}
  {#if value != null}
    <span class="caption-color overflow-label">{value}</span>
  {:else}
    <span class="content-dark-color"><Label label={placeholder} /></span>
  {/if}
{:else}
  <EditBox {placeholder} value={value ?? undefined} format={'number'} {autoFocus} on:change={onEditBoxChange} />
{/if}
