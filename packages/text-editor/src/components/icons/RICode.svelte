<script lang="ts">
  export let size: 'small' | 'medium' | 'large'

  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M5.3,4.2c0.3,0,0.5-0.2,0.5-0.5S5.6,3.2,5.3,3.2H3.4c-0.3,0-0.5,0.2-0.5,0.5v12.5c0,0.3,0.2,0.5,0.5,0.5h1.9c0.3,0,0.5-0.2,0.5-0.5s-0.2-0.5-0.5-0.5H3.9V4.2H5.3z"
  />
  <path
    d="M16.6,3.2h-1.9c-0.3,0-0.5,0.2-0.5,0.5s0.2,0.5,0.5,0.5h1.4v11.5h-1.4c-0.3,0-0.5,0.2-0.5,0.5s0.2,0.5,0.5,0.5h1.9c0.3,0,0.5-0.2,0.5-0.5V3.8C17.1,3.5,16.8,3.2,16.6,3.2z"
  />
</svg>
