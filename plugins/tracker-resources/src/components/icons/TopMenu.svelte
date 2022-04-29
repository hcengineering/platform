<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M3,9.6h18c0.3,0,0.6-0.3,0.6-0.6S21.3,8.4,21,8.4H3C2.7,8.4,2.4,8.7,2.4,9S2.7,9.6,3,9.6z" />
  <path d="M21,14.4H3c-0.3,0-0.6,0.3-0.6,0.6s0.3,0.6,0.6,0.6h18c0.3,0,0.6-0.3,0.6-0.6S21.3,14.4,21,14.4z" />
</svg>
