<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
  <g transform="translate(2,3)">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M0 2C0 0.895431 0.895431 0 2 0H12C13.1046 0 14 0.895431 14 2V10C14 11.1046 13.1046 12 12 12H2C0.895431 12 0 11.1046 0 10V2ZM5.5 1H8.5V5.5H5.5V1ZM4.5 5.5V1H2C1.44772 1 1 1.44772 1 2V5.5H4.5ZM1 6.5V10C1 10.5523 1.44772 11 2 11H4.5V6.5H1ZM5.5 6.5H8.5V11H5.5V6.5ZM9.5 6.5V11H12C12.5523 11 13 10.5523 13 10V6.5H9.5ZM13 5.5V2C13 1.44772 12.5523 1 12 1H9.5V5.5H13Z"
    />
  </g>
</svg>
