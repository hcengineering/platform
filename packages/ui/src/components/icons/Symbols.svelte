<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  export let opacity: string = '1'
  const fill: string = 'currentColor'
</script>

<svg xmlns="http://www.w3.org/2000/svg" class="svg-{size}" {fill} viewBox="0 0 16 16">
  <path
    {opacity}
    d="M 14.5 2.792969 L 5.5 11.792969 L 1.851563 8.148438 L 1.5 7.792969 L 0.792969 8.5 L 1.148438 8.851563 L 5.5 13.207031 L 15.207031 3.5 Z"
  /></svg
>
