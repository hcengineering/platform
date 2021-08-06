<script lang="ts">
  import { IconSize } from '@anticrm/ui'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M25.4,24.6l-4.8-4.8c1.2-1.4,2-3.3,2-5.3c0-4.5-3.6-8.1-8.1-8.1c-4.5,0-8.1,3.6-8.1,8.1c0,4.5,3.6,8.1,8.1,8.1 c2,0,3.9-0.7,5.3-2l4.8,4.8c0.1,0.1,0.3,0.2,0.4,0.2s0.3-0.1,0.4-0.2C25.7,25.2,25.7,24.8,25.4,24.6z M7.6,14.5 c0-3.8,3.1-6.9,6.9-6.9s6.9,3.1,6.9,6.9c0,1.9-0.8,3.6-2,4.9c0,0,0,0,0,0s0,0,0,0c-1.2,1.2-3,2-4.9,2C10.7,21.4,7.6,18.3,7.6,14.5z"/>
  </svg>
</IconSize>
