<script lang="ts">
  export let size: 'x-small' | 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path
    d="M7.49988 8.49991V12.9999H8.49988V8.49991L13 8.49994L13 7.49994L8.49988 7.49991V2.99988H7.49988V7.49991L3.00001 7.49988L3 8.49988L7.49988 8.49991Z"
  />
</svg>
