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
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M8,1C4.1,1,1,4.1,1,8c0,3.9,3.1,7,7,7c3.9,0,7-3.1,7-7C15,4.1,11.9,1,8,1z M8,14c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S11.3,14,8,14z"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M10.5,5.5c-0.2-0.2-0.6-0.2-0.8,0L8,7.2L6.3,5.5c-0.2-0.2-0.6-0.2-0.8,0s-0.2,0.6,0,0.8L7.2,8L5.5,9.7c-0.2,0.2-0.2,0.6,0,0.8s0.6,0.2,0.8,0L8,8.8l1.7,1.7c0.2,0.2,0.6,0.2,0.8,0c0.2-0.2,0.2-0.6,0-0.8L8.8,8l1.7-1.7C10.8,6.1,10.8,5.7,10.5,5.5z"
  />
</svg>
