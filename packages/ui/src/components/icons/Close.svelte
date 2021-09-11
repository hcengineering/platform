<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M8.9,8l6.9-6.9c0.2-0.2,0.2-0.6,0-0.9s-0.6-0.2-0.9,0L8,7.1L1.1,0.2c-0.2-0.2-0.6-0.2-0.9,0s-0.2,0.6,0,0.9L7.1,8l-6.9,6.9 c-0.2,0.2-0.2,0.6,0,0.9C0.3,15.9,0.5,16,0.6,16s0.3-0.1,0.4-0.2L8,8.9l6.9,6.9c0.1,0.1,0.3,0.2,0.4,0.2c0.2,0,0.3-0.1,0.4-0.2 c0.2-0.2,0.2-0.6,0-0.9L8.9,8z"/>
</svg>
