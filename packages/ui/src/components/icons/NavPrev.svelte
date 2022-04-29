<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 12">
  <path
    d="M6,11.8c-0.2,0-0.4-0.1-0.5-0.2L1.2,7.2C0.8,6.9,0.7,6.5,0.7,6s0.2-0.9,0.5-1.2l4.3-4.3c0.3-0.3,0.8-0.3,1.1,0 s0.3,0.8,0,1.1L2.2,5.8c-0.1,0.1-0.1,0.3,0,0.4l4.3,4.3c0.3,0.3,0.3,0.8,0,1.1C6.4,11.7,6.2,11.8,6,11.8z"
  />
</svg>
