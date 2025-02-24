<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M22.3,7.5v-4c0-1-0.8-1.8-1.8-1.8h-17c-1,0-1.8,0.8-1.8,1.8v4.1c0,1,0.8,1.8,1.8,1.8h17.1C21.5,9.3,22.3,8.5,22.3,7.5z M9.2,7.8V3.2h5v4.6H9.2z M3.7,3.2h4v4.6h-4c-0.3,0-0.5-0.2-0.5-0.5V3.7C3.2,3.4,3.4,3.2,3.7,3.2zM20.8,7.3c0,0.3-0.2,0.5-0.5,0.5h-4.6V3.2h4.6c0.3,0,0.5,0.2,0.5,0.5V7.3z"
    fill-rule="evenodd"
    clip-rule="evenodd"
  />
  <path
    d="M21.8,20.7l-2-2l1.9-1.9c0.3-0.3,0.3-0.8,0-1.1c-0.3-0.3-0.7-0.3-1.1,0l-1.9,1.9l-1.9-1.9c-0.3-0.3-0.8-0.3-1.1,0c-0.3,0.3-0.3,0.8,0,1.1l1.9,1.9l-2,2c-0.3,0.3-0.3,0.8,0,1.1s0.8,0.3,1.1,0l2-2l2,2c0.3,0.3,0.8,0.3,1.1,0S22.1,21,21.8,20.7z"
    fill-rule="evenodd"
    clip-rule="evenodd"
  />
</svg>
