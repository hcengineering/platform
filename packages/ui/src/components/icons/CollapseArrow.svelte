<script lang="ts">
  export let size: 'tiny' | 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M10.6572 8.00049L6.82861 4.17187L6.82861 11.8291L10.6572 8.00049Z" />
</svg>
