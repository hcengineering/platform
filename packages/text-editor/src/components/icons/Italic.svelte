<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M24 9C24.5523 9 25 8.55228 25 8C25 7.44772 24.5523 7 24 7H13C12.4477 7 12 7.44772 12 8C12 8.55228 12.4477 9 13 9H17.14L12.77 23H8C7.44771 23 7 23.4477 7 24C7 24.5523 7.44772 25 8 25H19C19.5523 25 20 24.5523 20 24C20 23.4477 19.5523 23 19 23H14.86L19.23 9H24Z"
  />
</svg>
