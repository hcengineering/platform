<script lang="ts">
  import { numberToHexColor, numberToRGB } from '@anticrm/ui'

  export let value: number
  export let size: 'small' | 'medium' | 'large' = 'medium'

  let isHovered = false

</script>

{#if value}
  <div
    class="border-radius-1 min-w-9"
    class:h-8={size === 'large'}
    class:h-7={size === 'medium'}
    class:h-6={size === 'small'}
    style:background-color={isHovered ? numberToRGB(value, 0.6) : numberToHexColor(value)}
    on:click
    on:mouseover={() => {
      isHovered = true
    }}
    on:focus={() => {
      isHovered = true
    }}
    on:mouseout={() => {
      isHovered = false
    }}
    on:blur={() => {
      isHovered = false
    }}>
    <slot />
  </div>
{/if}
