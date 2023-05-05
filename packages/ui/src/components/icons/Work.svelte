<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  export let opacity: string = '1'
</script>

<svg class="svg-{size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g {opacity}>
    <path
      d="M14.1665 7.5L11.789 11.0662C11.3631 11.7051 10.4059 11.6455 10.0625 10.9587L9.93713 10.7079C9.59375 10.0212 8.63657 9.96157 8.21066 10.6004L5.83317 14.1667"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <rect x="2.5" y="2.5" width="15" height="15" rx="2" stroke="currentColor" />
  </g>
</svg>
