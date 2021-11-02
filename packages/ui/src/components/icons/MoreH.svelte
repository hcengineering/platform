<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M8,6.6C7.2,6.6,6.6,7.2,6.6,8c0,0.8,0.6,1.4,1.4,1.4S9.4,8.8,9.4,8C9.4,7.2,8.8,6.6,8,6.6z" />
  <path d="M3.2,6.6C2.4,6.6,1.8,7.2,1.8,8c0,0.8,0.6,1.4,1.4,1.4S4.6,8.8,4.6,8C4.6,7.2,4,6.6,3.2,6.6z" />
  <path d="M12.8,6.6c-0.8,0-1.4,0.6-1.4,1.4c0,0.8,0.6,1.4,1.4,1.4s1.4-0.6,1.4-1.4C14.2,7.2,13.6,6.6,12.8,6.6z" />
</svg>
