<script lang="ts">
  import { IconSize } from '@anticrm/ui'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.8,10.3c-1,0-1.8,0.8-1.8,1.7s0.8,1.7,1.8,1.7c1,0,1.8-0.8,1.8-1.7S12.7,10.3,11.8,10.3z" />
    <path d="M18,10.3c-1,0-1.8,0.8-1.8,1.7s0.8,1.7,1.8,1.7c1,0,1.8-0.8,1.8-1.7S18.9,10.3,18,10.3z" />
    <path d="M5.5,10.3c-1,0-1.8,0.8-1.8,1.7s0.8,1.7,1.8,1.7c1,0,1.8-0.8,1.8-1.7S6.5,10.3,5.5,10.3z" />
  </svg>
</IconSize>
