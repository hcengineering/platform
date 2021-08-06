<script lang="ts">
  import { IconSize } from '@anticrm/ui'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <polygon points="6.5,14.5 5.5,13.5 10.9,8 5.5,2.5 6.5,1.5 13.1,8 "/>
  </svg>
</IconSize>
