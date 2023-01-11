<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g>
    <path
      {fill}
      d="M7.1,13.2c0.3,0.3,0.8,0.3,1.1,0c0.3-0.3,0.3-0.8,0-1.1l-0.6-0.6c-0.3-0.3-0.8-0.3-1.1,0c-0.3,0.3-0.3,0.8,0,1.1L7.1,13.2z"
      fill-rule="evenodd"
      clip-rule="evenodd"
    />
    <path
      {fill}
      d="M22.5,6.5c-0.3-0.3-0.8-0.3-1.1,0L12,15.9l-0.1-0.1c-0.3-0.3-0.8-0.3-1.1,0c-0.3,0.3-0.3,0.8,0,1.1l0.6,0.6c0.3,0.3,0.8,0.3,1.1,0l10-10C22.8,7.2,22.8,6.8,22.5,6.5z"
      fill-rule="evenodd"
      clip-rule="evenodd"
    />
    <path
      {fill}
      d="M17.5,6.5c-0.3-0.3-0.8-0.3-1.1,0L7,15.9l-4.5-4.5c-0.3-0.3-0.8-0.3-1.1,0c-0.3,0.3-0.3,0.8,0,1.1l5,5c0.3,0.3,0.8,0.3,1.1,0l10-10C17.8,7.2,17.8,6.8,17.5,6.5z"
      fill-rule="evenodd"
      clip-rule="evenodd"
    />
  </g>
</svg>
