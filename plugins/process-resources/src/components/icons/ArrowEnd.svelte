<script lang="ts">
  export let size: 'small' | 'medium' | 'large' | 'full'
  const fill: string = 'currentColor'
</script>

<svg xmlns="http://www.w3.org/2000/svg" class="svg-{size}" viewBox="0 0 16 45" fill="none">
  <path d="M8 0L8 43" stroke={fill} />
  <path
    d="M12.295 37.295L8.5 41.085V31.5C8.5 31.22386 8.27614 31 8 31C7.72386 31 7.5 31.22386 7.5 31.5V41.085L3.705 37.295L3 38L8 43L13 38L12.295 37.295Z"
    {fill}
  />
</svg>
