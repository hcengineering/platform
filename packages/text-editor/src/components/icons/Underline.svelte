<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path
    d="M10 17V8C10 7.44772 9.55228 7 9 7C8.44772 7 8 7.44772 8 8V17C8 21.4183 11.5817 25 16 25H17V24.9381C20.9463 24.446 24 21.0796 24 17V8C24 7.44772 23.5523 7 23 7C22.4477 7 22 7.44772 22 8V17C22 20.3137 19.3137 23 16 23C12.6863 23 10 20.3137 10 17Z"
  />
  <path
    d="M8 27C7.44772 27 7 27.4477 7 28C7 28.5523 7.44772 29 8 29H24C24.5523 29 25 28.5523 25 28C25 27.4477 24.5523 27 24 27H8Z"
  />
</svg>
