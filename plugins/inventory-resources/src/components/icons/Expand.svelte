<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" fill="none" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
  <path d="M10.5 3.75L6 8.25L1.5 3.75" stroke={fill} />
</svg>
