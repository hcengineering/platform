<script lang="ts">
  import IconSize from '../IconSize.svelte'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <polygon points="6.4,14.4 5.6,13.6 11.3,8 5.6,2.4 6.4,1.6 12.7,8 "/>
  </svg>
</IconSize>
