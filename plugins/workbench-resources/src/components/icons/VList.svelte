<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <g>
    <rect width="16" height="1.7" />
    <rect y="7.2" width="16" height="1.7" />
    <rect y="14.3" width="16" height="1.7" />
  </g>
</svg>
