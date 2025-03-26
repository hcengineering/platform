<script lang="ts">
  import { ColorDefinition, IconSize, getPlatformColorDef, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  export let size: IconSize = 'small'

  export let fill: number = 11

  const dispatch = createEventDispatcher()

  const dispatchAccentColor = (color?: ColorDefinition) => dispatch('accent-color', color)

  export let count: number | undefined = undefined
  export let index: number | undefined = undefined

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
  style:transform={'rotate(-90deg)'}
  viewBox="0 0 16 16"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14ZM8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15Z"
  />
  {#if count !== undefined && index}
    <path
      d="M 4.5 4.5 L 9 4.5 A 4.5 4.5 0 {index > (count - 1) / 2 ? 1 : 0} 1 {Math.cos(
        ((2 * Math.PI) / count) * index - 0.01
      ) *
        4.5 +
        4.5} {Math.sin(((2 * Math.PI) / count) * index - 0.01) * 4.5 + 4.5} Z"
      transform="translate(3.5,3.5)"
    />
  {:else}
    <path
      d="M 4.5 4.5 L 9 4.5 A 4.5 4.5 0 1 1 {Math.cos(Math.PI - 0.01) * 4.5 + 4.5} {Math.sin(Math.PI - 0.01) * 4.5 +
        4.5} Z"
      transform="translate(3.5,3.5)"
    />
  {/if}
</svg>
