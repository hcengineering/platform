<script lang="ts">
  import { IconSize } from '@anticrm/ui'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <g>
      <rect width="2.9" height="2.9" />
      <rect x="6.6" width="2.9" height="2.9" />
      <rect x="13.1" width="2.9" height="2.9" />
      <rect y="6.6" width="2.9" height="2.9" />
      <rect x="6.6" y="6.6" width="2.9" height="2.9" />
      <rect x="13.1" y="6.6" width="2.9" height="2.9" />
      <rect y="13.1" width="2.9" height="2.9" />
      <rect x="6.6" y="13.1" width="2.9" height="2.9" />
      <rect x="13.1" y="13.1" width="2.9" height="2.9" />
    </g>
  </svg>
</IconSize>
