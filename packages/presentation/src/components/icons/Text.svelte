<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M5.032 13l.9-3h4.137l.9 3h1.775l-3-10H6.256l-3 10h1.776zm2.4-8h1.137l.9 3H6.532l.9-3z" />
</svg>
