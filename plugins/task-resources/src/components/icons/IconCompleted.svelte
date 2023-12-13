<script lang="ts">
  import { ColorDefinition, IconSize, getPlatformColorDef, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  export let size: IconSize = 'small'

  export let fill: number = -1

  const dispatch = createEventDispatcher()

  const dispatchAccentColor = (color?: ColorDefinition) => dispatch('accent-color', color)

  $: color = getPlatformColorDef(fill, $themeStore.dark)
  $: dispatchAccentColor(color)

  onMount(() => {
    dispatchAccentColor(color)
  })
</script>

<svg
  class="svg-{size}"
  fill={color?.icon ?? 'currentColor'}
  style:flex-shrink={0}
  viewBox="0 0 16 16"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    d="M8,1C4.1,1,1,4.1,1,8c0,3.9,3.1,7,7,7c3.9,0,7-3.1,7-7C15,4.1,11.9,1,8,1z M8,14c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S11.3,14,8,14z"
  />
  <path
    d="M10.6,6.1L7.5,9.2L5.9,7.6c-0.2-0.2-0.6-0.2-0.8,0s-0.2,0.6,0,0.8l2,2c0.1,0.1,0.3,0.2,0.4,0.2s0.3-0.1,0.4-0.2l3.5-3.5c0.2-0.2,0.2-0.6,0-0.8S10.8,5.8,10.6,6.1z"
  />
</svg>
