<script lang="ts">
  import { CardCover } from '@anticrm/board'
  import { Button, eventToHTMLElement, IconAdd, showPopup } from '@anticrm/ui'
  import CardCoverPicker from '../popups/CardCoverPicker.svelte'
  import CardCoverPresenter from '../presenters/CardCoverPresenter.svelte'

  export let value: CardCover
  export let onChange: (value: any) => void

  const coverHandler = (ev: MouseEvent) => {
    showPopup(CardCoverPicker, { value, onChange }, eventToHTMLElement(ev))
  }
</script>

{#if value}
  <CardCoverPresenter {value} on:click={coverHandler} />
{:else}
  <Button icon={IconAdd} kind="no-border" on:click={coverHandler} />
{/if}
