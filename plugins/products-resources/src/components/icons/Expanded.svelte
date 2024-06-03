<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <polygon points="8,11.7 1.6,5.4 2.4,4.6 8,10.3 13.6,4.6 14.4,5.4 " />
</svg>
