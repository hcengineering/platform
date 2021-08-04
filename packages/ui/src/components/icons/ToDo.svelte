<script lang="ts">
  import IconSize from '../IconSize.svelte'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
    <g>
      <path d="M12,0H4C1.8,0,0,1.8,0,4v8c0,2.2,1.8,4,4,4h8c2.2,0,4-1.8,4-4V4C16,1.8,14.2,0,12,0z M15,12c0,1.7-1.3,3-3,3H4 c-1.7,0-3-1.3-3-3V4c0-1.7,1.3-3,3-3h8c1.7,0,3,1.3,3,3V12z"/>
      <path d="M11.6,4.7L6.8,9.8L4.4,7.3c-0.2-0.2-0.5-0.2-0.7,0C3.5,7.5,3.5,7.8,3.6,8l3.2,3.2l5.5-5.9c0.2-0.2,0.2-0.5,0-0.7 C12.1,4.4,11.8,4.5,11.6,4.7z"/>
    </g>
  </svg>
</IconSize>
