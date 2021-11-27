<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <polygon points="8,12.1 1.5,5.5 2.5,4.5 8,9.9 13.5,4.5 14.5,5.5 " />
</svg>
