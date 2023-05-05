<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    {fill}
    d="M29.7071 6.29314C30.0976 6.68366 30.0976 7.31683 29.7071 7.70735L13.7071 23.7074C13.3166 24.0979 12.6834 24.0979 12.2929 23.7074L4.29289 15.7074C3.90237 15.3168 3.90237 14.6837 4.29289 14.2931C4.68342 13.9026 5.31658 13.9026 5.70711 14.2931L13 21.586L28.2929 6.29314C28.6834 5.90261 29.3166 5.90261 29.7071 6.29314Z"
  />
</svg>
