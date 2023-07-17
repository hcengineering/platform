<script lang="ts">
  export let size: 'x-small' | 'small' | 'medium' | 'large' | 'full'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 22L6 12L7.4 10.6L16 19.2L24.6 10.6L26 12L16 22Z" />
</svg>
