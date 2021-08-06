<script lang="ts">
  import { IconSize } from '@anticrm/ui'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20,11.2h-7.2V4c0-0.4-0.3-0.8-0.8-0.8S11.2,3.6,11.2,4v7.2H4c-0.4,0-0.8,0.3-0.8,0.8s0.3,0.8,0.8,0.8h7.2V20 c0,0.4,0.3,0.8,0.8,0.8s0.8-0.3,0.8-0.8v-7.2H20c0.4,0,0.8-0.3,0.8-0.8S20.4,11.2,20,11.2z"/>
  </svg>
</IconSize>
