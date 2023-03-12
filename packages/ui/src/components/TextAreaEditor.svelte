<script lang="ts">
  import type { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import ui from '../plugin'
  import IconClose from './icons/Close.svelte'
  import ActionIcon from './ActionIcon.svelte'
  import Button from './Button.svelte'
  import TextArea from './TextArea.svelte'

  export let inputRef: TextArea | undefined = undefined
  export let value: string = ''
  export let width: string | undefined = undefined
  export let height: string | undefined = undefined
  export let submitLabel: IntlString = ui.string.Save
  export let placeholder: IntlString | undefined = undefined
  export let disabled: boolean = false

  const dispatch = createEventDispatcher()
  let isEditing = false
  let openedContainerRef: HTMLDivElement

  async function onClickOutside (e: any) {
    if (openedContainerRef && !openedContainerRef.contains(e.target) && !e.defaultPrevented && isEditing) {
      if (value) {
        submit()
      }
    }
  }

  const submit = () => {
    dispatch('submit', value)
  }
  const cancel = () => {
    dispatch('cancel')
  }
  const onKeydown = (e: any) => {
    if (e.detail.key !== 'Enter') {
      return
    }

    e.detail.preventDefault()
    submit()
  }

  $: if (inputRef && !value) {
    isEditing = true
    inputRef.focus()
  }
</script>

<svelte:window on:click={onClickOutside} />
<div bind:this={openedContainerRef}>
  <div
    class="flex-col background-accent-bg-color border-divider-color border-radius-1 pt-1 pb-1 pr-2 pl-2"
    style:user-select="none"
  >
    <TextArea
      {placeholder}
      {height}
      {width}
      {disabled}
      bind:this={inputRef}
      bind:value
      on:keydown={onKeydown}
      noFocusBorder={true}
    />
  </div>
  {#if !disabled}
    <div class="flex-row-center mt-3">
      <Button label={submitLabel} kind="no-border" size="medium" on:click={submit} />
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="ml-2" on:click={cancel}>
        <ActionIcon icon={IconClose} size="medium" action={cancel} />
      </div>
    </div>
  {/if}
</div>
