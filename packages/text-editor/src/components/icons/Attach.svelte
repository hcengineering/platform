<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
  <path
    d="M4.8,10.5l5.7-5.7c1.2-1.2,3.1-1.2,4.2,0c1.2,1.2,1.2,3.1,0,4.2L8,15.8c-0.6,0.6-1.5,0.6-2.1,0c-0.6-0.6-0.6-1.5,0-2.1l6-6c0.2-0.2,0.2-0.5,0-0.7s-0.5-0.2-0.7,0l-6,6c-1,1-1,2.6,0,3.5c1,1,2.6,1,3.5,0l6.7-6.7c1.6-1.6,1.6-4.1,0-5.7s-4.1-1.6-5.7,0L4.1,9.8c-0.2,0.2-0.2,0.5,0,0.7C4.3,10.7,4.6,10.7,4.8,10.5z"
  />
</svg>
