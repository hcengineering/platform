<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <polygon points="14.7,2.3 14,1.7 7.9,8 14,14.3 14.7,13.7 9.3,8 " />
  <polygon points="8.1,2.3 7.4,1.7 1.3,8 7.4,14.3 8.1,13.7 2.7,8 " />
</svg>
