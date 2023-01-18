<script lang="ts">
  export let size: 'x-small' | 'small' | 'medium' | 'large' | 'full'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M4.2,4.9L3,6.1l5,5l5-5l-1.2-1.2L8,8.7L4.2,4.9z" />
</svg>
