<script lang="ts">
  import IconSize from '../../IconSize.svelte'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.9,21.6c-0.1,0-0.1,0-0.2,0c-5-0.2-9.1-4.3-9.3-9.3c-0.1-5.2,3.7-9.5,8.8-9.9c0.2,0,0.5,0.1,0.6,0.3 c0.1,0.2,0.1,0.5,0,0.7c-1.9,2.6-1.6,6.1,0.6,8.3c2.2,2.3,5.8,2.6,8.3,0.7c0.2-0.1,0.4-0.2,0.7,0c0.2,0.1,0.3,0.3,0.3,0.6 C21.2,17.8,16.9,21.6,11.9,21.6z M10,3.8c-3.8,0.9-6.5,4.3-6.4,8.5c0.2,4.4,3.8,7.9,8.1,8.1c4,0.1,7.6-2.6,8.5-6.4 c-2.9,1.4-6.4,0.9-8.7-1.5C9.1,10.2,8.6,6.7,10,3.8z"/>
  </svg>
</IconSize>
