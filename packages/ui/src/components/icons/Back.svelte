<script lang="ts">
  import IconSize from '../IconSize.svelte'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <polygon points="10.6,14.4 4.3,8 10.6,1.6 11.4,2.4 5.7,8 11.4,13.6 "/>
  </svg>
</IconSize>
