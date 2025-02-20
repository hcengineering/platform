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
    d="M11,21.8c-0.1,0-0.2,0-0.2,0c-0.3-0.1-0.5-0.4-0.5-0.7v-6.2H5c-0.3,0-0.5-0.2-0.7-0.4c-0.1-0.3-0.1-0.6,0.1-0.8l8-11c0.2-0.3,0.5-0.4,0.8-0.3c0.3,0.1,0.5,0.4,0.5,0.7v6.2H19c0.3,0,0.5,0.2,0.7,0.4s0.1,0.6-0.1,0.8l-8,11C11.5,21.6,11.2,21.8,11,21.8z M6.5,13.2H11c0.4,0,0.8,0.3,0.8,0.8v4.7l5.8-7.9H13c-0.4,0-0.8-0.3-0.8-0.8V5.3L6.5,13.2z"
  />
</svg>
