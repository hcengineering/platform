<script lang="ts">
  //
  // © 2025 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //
  export let size: 'small' | 'medium' | 'large' | 'x-large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" viewBox="0 0 24 24" {fill} xmlns="http://www.w3.org/2000/svg">
  <path
    d="M19.3,4.3c-0.3-0.1-0.6-0.1-0.8,0.2c-1.6,1.6-4.3,1.6-5.9,0c-2.2-2.2-5.8-2.2-8,0C4.3,4.6,4.2,4.8,4.2,5v9v7c0,0.4,0.3,0.8,0.8,0.8s0.8-0.3,0.8-0.8v-6.6c1.7-1.4,4.2-1.4,5.7,0.2c1.1,1.1,2.6,1.6,4,1.6s2.9-0.5,4-1.6c0.1-0.1,0.2-0.3,0.2-0.5V5C19.8,4.7,19.6,4.4,19.3,4.3z M18.2,13.7c-1.7,1.4-4.2,1.3-5.7-0.2c-1.1-1.1-2.6-1.6-4-1.6c-0.9,0-1.9,0.2-2.8,0.7V5.3C7.4,3.9,9.9,4,11.5,5.5c1.8,1.8,4.6,2.1,6.8,0.9V13.7z"
  />
</svg>
