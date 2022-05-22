<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M18,2.2h-3.3c-0.1,0-0.2,0-0.3,0H10C9.6,2.2,9.2,2.6,9.2,3S9.6,3.8,10,3.8h3.5L8.9,20.2H6 c-0.4,0-0.8,0.3-0.8,0.8s0.3,0.8,0.8,0.8h8c0.4,0,0.8-0.3,0.8-0.8s-0.3-0.8-0.8-0.8h-3.5l4.6-16.5H18c0.4,0,0.8-0.3,0.8-0.8 S18.4,2.2,18,2.2z"
  />
</svg>
