<script lang="ts">
  export let size: 'small' | 'medium' | 'large' | 'full'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" viewBox="0 0 6 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M3 0.333333C1.52724 0.333333 0.333333 1.52724 0.333333 3C0.333333 4.47276 1.52724 5.66667 3 5.66667C4.47276 5.66667 5.66667 4.47276 5.66667 3C5.66667 1.52724 4.47276 0.333333 3 0.333333ZM2.5 3L2.5 48L3.5 48L3.5 3L2.5 3Z"
    {fill}
  />
</svg>
