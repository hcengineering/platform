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
    d="M21.5,11.5l-9-9c-0.3-0.3-0.8-0.3-1.1,0l-9,9c-0.2,0.2-0.3,0.5-0.2,0.8s0.4,0.5,0.7,0.5h1.2V19c0,1.5,1.2,2.8,2.8,2.8h10c1.5,0,2.8-1.2,2.8-2.8v-6.2H21c0.3,0,0.6-0.2,0.7-0.5C21.8,12,21.7,11.7,21.5,11.5z M18.2,19c0,0.7-0.6,1.2-1.2,1.2H7c-0.7,0-1.2-0.6-1.2-1.2v-7c0-0.4-0.3-0.8-0.8-0.8H4.8L12,4.1l7.2,7.2H19c-0.4,0-0.8,0.3-0.8,0.8V19z"
  />
  <path
    d="M14,11.2h-4c-0.4,0-0.8,0.3-0.8,0.8v4c0,0.4,0.3,0.8,0.8,0.8h4c0.4,0,0.8-0.3,0.8-0.8v-4C14.8,11.6,14.4,11.2,14,11.2zM13.2,15.2h-2.5v-2.5h2.5V15.2z"
  />
</svg>
