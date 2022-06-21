<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  export let opacity: string = '1'
  const fill: string = 'currentColor'
</script>

<svg xmlns="http://www.w3.org/2000/svg" class="svg-{size}" {fill} viewBox="0 0 16 16">
  <path
    {opacity}
    d="M 8 1.320313 L 0.660156 8.132813 L 1.339844 8.867188 L 2 8.253906 L 2 14 L 7 14 L 7 9 L 9 9 L 9 14 L 14 14 L 14 8.253906 L 14.660156 8.867188 L 15.339844 8.132813 Z M 8 2.679688 L 13 7.328125 L 13 13 L 10 13 L 10 8 L 6 8 L 6 13 L 3 13 L 3 7.328125 Z"
  /></svg
>
