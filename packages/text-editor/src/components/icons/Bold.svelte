<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M15.6,11.5c1.3-1.1,2.1-2.7,2.1-4.5c0-3.2-2.6-5.8-5.7-5.8H5.5C5.1,1.2,4.8,1.6,4.8,2v10v10 c0,0.4,0.3,0.8,0.8,0.8H14c3.2,0,5.7-2.6,5.7-5.8C19.8,14.4,18,12.2,15.6,11.5z M6.2,2.8H12c2.3,0,4.2,1.9,4.2,4.2s-1.9,4.2-4.2,4.2 H6.2V2.8z M14,21.2H6.2v-8.5H12h2c2.3,0,4.2,1.9,4.2,4.2S16.4,21.2,14,21.2z"
  />
</svg>
