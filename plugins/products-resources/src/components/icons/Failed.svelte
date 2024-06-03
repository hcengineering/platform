<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
  <path
    style="fill-rule:evenodd;clip-rule:evenodd;"
    d="M7,14c3.9,0,7-3.1,7-7c0-3.9-3.1-7-7-7C3.1,0,0,3.1,0,7C0,10.9,3.1,14,7,14z M5,4C4.7,3.7,4.3,3.7,4,4S3.7,4.7,4,5l2,2L4,9C3.7,9.3,3.7,9.7,4,10c0.3,0.3,0.8,0.3,1.1,0l2-2l2,2c0.3,0.3,0.8,0.3,1.1,0c0.3-0.3,0.3-0.8,0-1.1l-2-2l2-2c0.3-0.3,0.3-0.8,0-1.1C9.7,3.7,9.3,3.7,9,4l-2,2L5,4z"
  />
</svg>
