<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="9.4" width="16" height="1.2" />
  <rect x="4" y="14.4" width="16" height="1.2" />
</svg>
