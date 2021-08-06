<script lang="ts">
  import { IconSize } from '@anticrm/ui'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M24.5,26.6h-17c-0.9,0-1.6-0.7-1.6-1.6V14.7c0-0.5,0.2-0.9,0.6-1.3l8.8-6.9c0.6-0.5,1.4-0.5,2,0l8.2,6.9 c0.4,0.3,0.6,0.8,0.6,1.2V25C26.1,25.9,25.4,26.6,24.5,26.6z M16.3,7.4c-0.1,0-0.2,0-0.2,0.1l-8.8,6.9c-0.1,0.1-0.2,0.2-0.2,0.3V25 c0,0.2,0.2,0.4,0.4,0.4h17c0.2,0,0.4-0.2,0.4-0.4V14.7c0-0.1-0.1-0.2-0.1-0.3l-8.2-6.9C16.4,7.4,16.3,7.4,16.3,7.4z"/>
  </svg>
</IconSize>
