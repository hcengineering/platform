<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 16L10 24L11.4142 22.5858L4.82843 16L11.4142 9.41421L10 8L2 16Z" />
  <path d="M29.9999 16L21.9999 8L20.5857 9.41421L27.1715 16L20.5857 22.5858L21.9999 24L29.9999 16Z" />
</svg>
