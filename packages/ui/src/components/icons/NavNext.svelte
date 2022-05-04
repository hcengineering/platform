<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 12">
  <path
    d="M1,11.8c-0.2,0-0.4-0.1-0.5-0.2c-0.3-0.3-0.3-0.8,0-1.1l4.3-4.3c0.1-0.1,0.1-0.3,0-0.4L0.5,1.5 c-0.3-0.3-0.3-0.8,0-1.1s0.8-0.3,1.1,0l4.3,4.3C6.2,5.1,6.3,5.5,6.3,6S6.2,6.9,5.8,7.2l-4.3,4.3C1.4,11.7,1.2,11.8,1,11.8z"
  />
</svg>
