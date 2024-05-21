<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M5 3C5 1.89543 5.89543 1 7 1H12C13.1046 1 14 1.89543 14 3V10C14 11.1046 13.1046 12 12 12H7C5.89543 12 5 11.1046 5 10V3ZM7 2C6.44772 2 6 2.44772 6 3V10C6 10.5523 6.44772 11 7 11H12C12.5523 11 13 10.5523 13 10V3C13 2.44772 12.5523 2 12 2H7Z"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M4 5C3.44772 5 3 5.44772 3 6V13C3 13.5523 3.44772 14 4 14H9C9.55228 14 10 13.5523 10 13V12H11V13C11 14.1046 10.1046 15 9 15H4C2.89543 15 2 14.1046 2 13V6C2 4.89543 2.89543 4 4 4H5V5H4Z"
  />
</svg>
