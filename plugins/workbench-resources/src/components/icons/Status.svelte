<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M14.4,8c0,3.5-2.9,6.4-6.4,6.4c-3.5,0-6.4-2.9-6.4-6.4c0-3.5,2.9-6.4,6.4-6.4c0.1-0.4,0.3-0.8,0.5-1.2c-0.2,0-0.3,0-0.5,0 C3.8,0.4,0.4,3.8,0.4,8c0,4.2,3.4,7.6,7.6,7.6s7.6-3.4,7.6-7.6c0-0.2,0-0.3,0-0.5C15.2,7.7,14.8,7.9,14.4,8z"/>
  <circle cx="13" cy="3" r="3"/>
</svg>
