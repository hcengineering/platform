<script lang="ts">
  export let size: 'x-small' | 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M13 11h6V8a5 5 0 1 1 5 5h-3v6h3a5 5 0 1 1-5 5v-3h-6v3a5 5 0 1 1-5-5h3v-6H8a5 5 0 1 1 5-5zm-2-3v3H8a3 3 0 1 1 3-3m2 11h6v-6h-6zm-5 2a3 3 0 1 0 3 3v-3zm13 0v3a3 3 0 1 0 3-3zm0-10V8a3 3 0 1 1 3 3z"
  />
</svg>
