<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  export let style: 'table' | 'grid' = 'table'
  const fill: string = 'currentColor'
</script>

{#if style === 'table'}
  <svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M2 8C2 6.34315 3.34315 5 5 5H19C20.6569 5 22 6.34315 22 8V16C22 17.6569 20.6569 19 19 19H5C3.34315 19 2 17.6569 2 16V8ZM5 7H19C19.5523 7 20 7.44771 20 8V11H4V8C4 7.44772 4.44772 7 5 7ZM4 13V16C4 16.5523 4.44772 17 5 17H8V13H4ZM10 17H19C19.5523 17 20 16.5523 20 16V13H10V17Z"
      fill="currentColor"
    />
  </svg>
{:else if style === 'grid'}
  <svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
    ><path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M5 5C3.34315 5 2 6.34315 2 8V16C2 17.6569 3.34315 19 5 19H19C20.6569 19 22 17.6569 22 16V8C22 6.34315 20.6569 5 19 5H5ZM8 7H5C4.44772 7 4 7.44772 4 8V9H8V7ZM10 7V9H14V7H10ZM16 7V9H20V8C20 7.44771 19.5523 7 19 7H16ZM14 11H10V13H14V11ZM16 13V11H20V13H16ZM14 15H10V17H14V15ZM16 17V15H20V16C20 16.5523 19.5523 17 19 17H16ZM8 17V15H4V16C4 16.5523 4.44772 17 5 17H8ZM8 13V11H4V13H8Z"
      fill="currentColor"
    /></svg
  >
{/if}
