<script lang="ts">
  export let size: 'x-small' | 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" fill="none" viewBox="0 0 16 16">
  <path
    opacity="0.01"
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M0 16L16 16L16 2.54292e-07L-6.99382e-07 9.53674e-07L0 16Z"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M6.28273 14.1415L1.86168 9.72159C1.63012 9.49034 1.5 9.17654 1.5 8.84932C1.5 8.5221 1.63012 8.20831 1.86168 7.97706L8.04102 1.79315C8.22858 1.60546 8.48305 1.5 8.74839 1.5L13.5 1.5C14.0523 1.5 14.5 1.94772 14.5 2.5L14.5 7.25015C14.5 7.5154 14.3946 7.76979 14.207 7.95733L8.02156 14.1415C7.54056 14.6195 6.76373 14.6195 6.28273 14.1415Z"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle cx="11.4996" cy="4.49961" r="0.9" />
</svg>
