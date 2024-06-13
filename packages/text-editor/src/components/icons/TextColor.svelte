<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'

</script>

<svg class="svg-{size}" fill="{fill}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path d="M4 26H28V28H4V26Z" />
  <path d="M16 4L8 20H12L14 16H18L20 20H24L16 4ZM16 10L18.8 15H13.2L16 10Z" />
</svg>

<style>
    .svg-small {
        width: 16px;
        height: 16px;
    }
    .svg-medium {
        width: 24px;
        height: 24px;
    }
    .svg-large {
        width: 32px;
        height: 32px;
    }
</style>
