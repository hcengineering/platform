<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" viewBox="0 0 16 16" {fill} xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M14.8536 3.14645C15.0488 3.34171 15.0488 3.65829 14.8536 3.85355L6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645C2.34171 6.95118 2.65829 6.95118 2.85355 7.14645L6.5 10.7929L14.1464 3.14645C14.3417 2.95118 14.6583 2.95118 14.8536 3.14645Z"
  />
</svg>
