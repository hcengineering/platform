<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M7,0C3.1,0,0,3.1,0,7c0,3.9,3.1,7,7,7c3.9,0,7-3.1,7-7C14,3.1,10.9,0,7,0z M9.9,3.9c0.3-0.3,0.8-0.3,1.2,0l0,0c0.3,0.3,0.3,0.9,0,1.2l-5,5c-0.3,0.3-0.9,0.3-1.2,0l-2-2c-0.3-0.3-0.3-0.9,0-1.2c0.2-0.2,0.4-0.2,0.6-0.2s0.4,0.1,0.6,0.2l1.4,1.4l4-4v0L9.9,3.9z"
  />
</svg>
