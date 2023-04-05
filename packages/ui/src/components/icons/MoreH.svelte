<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <circle cx="8" cy="8" r="1" />
  <circle cx="4" cy="8" r="1" />
  <circle cx="12" cy="8" r="1" />
</svg>
