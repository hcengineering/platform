<script lang="ts">
  export let size: 'x-small' | 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path d="M9.465 8H2V6h8.535l12 18H30v2h-8.535zM18 6h12v2H18z" />
</svg>
