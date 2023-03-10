<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--caption-color)'
</script>

<svg class="svg-{size}" viewBox="0 0 24 24" {fill} xmlns="http://www.w3.org/2000/svg">
  <path
    d="M12.8,12l7.6-7.6c0.2-0.2,0.2-0.6,0-0.8s-0.6-0.2-0.8,0L12,11.2L4.4,3.6c-0.2-0.2-0.6-0.2-0.8,0s-0.2,0.6,0,0.8 l7.6,7.6l-7.6,7.6c-0.2,0.2-0.2,0.6,0,0.8c0.1,0.1,0.3,0.2,0.4,0.2s0.3-0.1,0.4-0.2l7.6-7.6l7.6,7.6c0.1,0.1,0.3,0.2,0.4,0.2 s0.3-0.1,0.4-0.2c0.2-0.2,0.2-0.6,0-0.8L12.8,12z"
  />
</svg>
