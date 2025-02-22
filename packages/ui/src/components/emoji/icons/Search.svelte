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
    d="M21.5,20.5L16,14.9c1.1-1.3,1.8-3.1,1.8-4.9c0-4.3-3.5-7.8-7.8-7.8S2.2,5.7,2.2,10s3.5,7.8,7.8,7.8c1.9,0,3.6-0.7,4.9-1.8l5.5,5.5c0.1,0.1,0.3,0.2,0.5,0.2s0.4-0.1,0.5-0.2C21.8,21.2,21.8,20.8,21.5,20.5z M3.8,10c0-3.4,2.8-6.2,6.2-6.2s6.2,2.8,6.2,6.2s-2.8,6.2-6.2,6.2S3.8,13.4,3.8,10z"
  />
</svg>
