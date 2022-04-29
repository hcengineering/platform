<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M8,6.6C7.3,6.6,6.7,7.2,6.7,8S7.3,9.4,8,9.4S9.4,8.8,9.4,8S8.8,6.6,8,6.6z" />
  <path d="M8,4.6c0.8,0,1.4-0.6,1.4-1.4S8.8,1.8,8,1.8S6.7,2.4,6.7,3.2S7.3,4.6,8,4.6z" />
  <path d="M8,11.4c-0.8,0-1.4,0.6-1.4,1.4c0,0.8,0.6,1.4,1.4,1.4s1.4-0.6,1.4-1.4C9.4,12,8.8,11.4,8,11.4z" />
</svg>
