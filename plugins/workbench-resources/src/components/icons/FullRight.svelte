<script lang="ts">
  import { IconSize } from '@anticrm/ui'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.4,2.6c-0.2-0.2-0.5-0.2-0.7,0c-0.2,0.2-0.2,0.5,0,0.7l4.1,4.1H2.3C2,7.5,1.8,7.7,1.8,8 c0,0.3,0.2,0.5,0.5,0.5h10.5l-4.1,4.1c-0.2,0.2-0.2,0.5,0,0.7c0.2,0.2,0.5,0.2,0.7,0l5-5c0.2-0.2,0.2-0.5,0-0.7L9.4,2.6z"/>
  </svg>
</IconSize>
