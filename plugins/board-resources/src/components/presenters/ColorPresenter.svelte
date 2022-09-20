<script lang="ts">
  import { numberToHexColor, numberToRGB } from '@hcengineering/ui'

  export let value: number
  export let size: 'tiny' | 'x-small' | 'small' | 'medium' | 'large' = 'medium'
  export let isHovered: boolean = false

  const hoverColor = numberToRGB(value, 0.6)
  const color = numberToHexColor(value)
</script>

{#if value}
  <div
    class="color-presenter border-radius-1 min-w-9"
    class:h-8={size === 'large'}
    class:h-7={size === 'medium'}
    class:h-6={size === 'small'}
    class:h-4={size === 'x-small'}
    class:h-2={size === 'tiny'}
    class:hovered={isHovered}
    style="--color-presenter-color: {color}; --color-presenter-hoverColor: {hoverColor}"
    on:click
  >
    <slot />
  </div>
{/if}

<style lang="scss">
  .color-presenter {
    background-color: var(--color-presenter-color);
    &:hover,
    &.hovered {
      background-color: var(--color-presenter-hoverColor);
    }
  }
</style>
