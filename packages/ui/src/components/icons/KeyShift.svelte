<script lang="ts">
  export let size: 'x-small' | 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M12 16v10h8V16h5.593L16 5.037 6.408 16zM2 18h8v10h12V18h8L16 2z" />
</svg>
