<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" viewBox="0 0 16 16" fill='none' xmlns="http://www.w3.org/2000/svg">
  <path d="M2 8.3324L6.65721 13L14 3" stroke={fill} stroke-linecap="round" stroke-linejoin="round"/>
</svg>
  