<script lang="ts">
  import IconSize from '../IconSize.svelte'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <g>
      <path d="M10,2.8C6,2.8,2.8,6,2.8,10S6,17.2,10,17.2h4.2c0.4,0,0.6,0,0.8,0c1.1-0.2,1.9-1,2.1-2c0-0.2,0-0.4,0-0.8V10 C17.2,6,14,2.8,10,2.8z M16.1,14.9c-0.1,0.6-0.6,1.1-1.2,1.2c-0.1,0-0.3,0-0.7,0H10c-3.4,0-6.2-2.8-6.2-6.2c0-3.4,2.8-6.2,6.2-6.2 s6.2,2.8,6.2,6.2v4.2C16.2,14.6,16.2,14.8,16.1,14.9z"/>
      <path d="M12.5,8.7h-5C7.2,8.7,7,8.9,7,9.2s0.2,0.5,0.5,0.5h5c0.3,0,0.5-0.2,0.5-0.5S12.8,8.7,12.5,8.7z"/>
      <path d="M12.5,12H10c-0.3,0-0.5,0.2-0.5,0.5S9.7,13,10,13h2.5c0.3,0,0.5-0.2,0.5-0.5S12.8,12,12.5,12z"/>
    </g>
  </svg>
</IconSize>
