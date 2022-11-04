<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 19 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M0.818182 24V0.727272H3.63636V11.0909H16.0455V0.727272H18.8636V24H16.0455V13.5909H3.63636V24H0.818182Z" />
</svg>
