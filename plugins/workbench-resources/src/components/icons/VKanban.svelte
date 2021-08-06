<script lang="ts">
  import { IconSize } from '@anticrm/ui'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14,0h-2.8H9.6H6.4H4.8H2C0.9,0,0,0.9,0,2v12c0,1.1,0.9,2,2,2h2.8h1.6h3.2h1.6H14c1.1,0,2-0.9,2-2V2C16,0.9,15.1,0,14,0z M2,14.8c-0.4,0-0.8-0.4-0.8-0.8V2c0-0.4,0.4-0.8,0.8-0.8h2.8v13.6H2z M6.4,14.8V1.2h3.2v13.6H6.4z M14.8,14c0,0.4-0.4,0.8-0.8,0.8 h-2.8V1.2H14c0.4,0,0.8,0.4,0.8,0.8V14z"
    />
  </svg>
</IconSize>
