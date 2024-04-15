<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M8,14.5c-3.6,0-6.5-2.9-6.5-6.5S4.4,1.5,8,1.5s6.5,2.9,6.5,6.5S11.6,14.5,8,14.5z M8,2.5C5,2.5,2.5,5,2.5,8 c0,3,2.5,5.5,5.5,5.5c3,0,5.5-2.5,5.5-5.5C13.5,5,11,2.5,8,2.5z"
  />
</svg>
