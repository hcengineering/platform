<script lang="ts">
  import type { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher, onMount } from 'svelte'
  import { IconClose } from '..'
  import Button from './Button.svelte'
  import Label from './Label.svelte'

  export let onProgress: (props?: Record<string, any>) => number
  export let onCancel: ((props?: Record<string, any>) => void) | undefined

  export let interval: number

  export let props: Record<string, any> | undefined
  export let label: IntlString
  export let labelProps: Record<string, any> | undefined

  let currentProgress = onProgress(props)

  onMount(() => {
    const timer = setInterval(() => {
      currentProgress = onProgress(props)
      if (currentProgress >= 100) {
        setTimeout(() => {
          dispatch('close')
        }, 1000)
      }
    }, interval)
    return () => {
      clearInterval(timer)
    }
  })

  const dispatch = createEventDispatcher()
</script>

<div class="flex-row-center container">
  <Label {label} params={labelProps ?? {}} />
  {currentProgress}%
  {#if onCancel !== undefined}
    <Button
      icon={IconClose}
      size={'small'}
      kind={'ghost'}
      on:click={() => {
        if (onCancel !== undefined) {
          onCancel?.(props)
        } else {
          dispatch('close')
        }
      }}
    />
  {/if}
</div>

<style lang="scss">
  .container {
    padding: 0.125rem 0.125rem 0.125rem 0.5rem;
    height: 1.625rem;
    font-weight: 500;
    background-color: var(--theme-button-pressed);
    border: 1px solid transparent;
    border-radius: 0.25rem;
    cursor: pointer;
  }
</style>
