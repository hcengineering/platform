<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M4.2,11.1L3,9.9l5-5l5,5l-1.2,1.2L8,7.3L4.2,11.1z" />
</svg>
