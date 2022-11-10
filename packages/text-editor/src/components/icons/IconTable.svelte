<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  export let style: 'table' | 'grid' | 'tableProps' = 'table'
  const fill: string = 'currentColor'
</script>

{#if style === 'table'}
  <svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path
      d="M19.5,2.2h-15c-1.2,0-2.2,1-2.2,2.2v2v3v10c0,1.2,1,2.2,2.2,2.2h10h3h2c1.2,0,2.2-1,2.2-2.2V10V7V4.5C21.8,3.3,20.7,2.2,19.5,2.2z M3.8,4.5c0-0.4,0.3-0.8,0.8-0.8h15c0.4,0,0.8,0.3,0.8,0.8V7v0.2H3.8V6.5V4.5z M9.5,20.2V8.8h5v11.5H9.5z M3.8,19.5v-10V8.8H8v11.5H4.5C4.1,20.2,3.8,19.9,3.8,19.5z M20.2,19.5c0,0.4-0.3,0.8-0.8,0.8h-2H16V8.8h4.2V10V19.5z"
      fill-rule="evenodd"
      clip-rule="evenodd"
    />
  </svg>
{:else if style === 'grid'}
  <svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M20.5,1.8h-17c-1,0-1.8,0.8-1.8,1.8v17c0,1,0.8,1.8,1.8,1.8h17c1,0,1.8-0.8,1.8-1.8v-17C22.2,2.5,21.5,1.8,20.5,1.8z M9.2,14.2V9.8h5v4.5H9.2z M14.2,15.8v5h-5v-5H14.2z M3.2,9.8h4.5v4.5H3.2V9.8z M9.2,8.2v-5h5v5H9.2zM15.8,9.8h5v4.5h-5V9.8z M20.8,3.5v4.8h-5v-5h4.8C20.6,3.2,20.8,3.4,20.8,3.5z M3.5,3.2h4.2v5H3.2V3.5C3.2,3.4,3.4,3.2,3.5,3.2zM3.2,20.5v-4.8h4.5v5H3.5C3.4,20.8,3.2,20.6,3.2,20.5z M20.5,20.8h-4.8v-5h5v4.8C20.8,20.6,20.6,20.8,20.5,20.8z"
      fill-rule="evenodd"
      clip-rule="evenodd"
    />
  </svg>
{:else if style === 'tableProps'}
  <svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M19.2,11.2C19,11,18.8,11,18.6,11c-0.2,0-0.4,0.1-0.5,0.3l-5.2,7.2c-0.1,0.1-0.1,0.3-0.1,0.4v2c0,0.4,0.3,0.8,0.8,0.8h2c0.2,0,0.5-0.1,0.6-0.3l5.5-7.5c0.2-0.3,0.2-0.8-0.1-1L19.2,11.2z M15.1,20.2h-0.9v-1l4.7-6.4l1.1,0.8L15.1,20.2z"
      fill-rule="evenodd"
      clip-rule="evenodd"
    />
    <path
      d="M19.5,2.2h-15c-1.2,0-2.2,1-2.2,2.2v2v3v10c0,1.2,1,2.2,2.2,2.2h7c0.4,0,0.8-0.3,0.8-0.8s-0.3-0.8-0.8-0.8h-2V8.8h5v4.1c0,0.4,0.3,0.8,0.8,0.8s0.8-0.3,0.8-0.8V8.8h4.2V10v0.9c0,0.4,0.3,0.8,0.8,0.8s0.8-0.3,0.8-0.8V10V7V4.5C21.8,3.3,20.7,2.2,19.5,2.2z M8,20.2H4.5c-0.4,0-0.8-0.3-0.8-0.8v-10V8.8H8V20.2z M3.8,7.2V6.5v-2c0-0.4,0.3-0.8,0.8-0.8h15c0.4,0,0.8,0.3,0.8,0.8V7v0.2H3.8z"
      fill-rule="evenodd"
      clip-rule="evenodd"
    />
  </svg>
{/if}
