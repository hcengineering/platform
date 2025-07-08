<!--
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  export let size: 'small' | 'medium' | 'large' = 'medium'
  export let fill: string = 'var(--theme-caption-color)'
  export let progress: number = 0

  // Calculate stroke-dashoffset based on progress
  const circumference = 62.83 // 2 × π × radius
  $: strokeDashoffset = circumference * (1 - progress / 100)
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle (optional, for visual reference) -->
  <circle cx="12" cy="12" r="10" fill="none" stroke={fill} stroke-width="2.5" opacity="0.2" />

  <!-- Progress circle -->
  <circle
    cx="12"
    cy="12"
    r="10"
    fill="none"
    stroke={fill}
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-dasharray={circumference}
    stroke-dashoffset={strokeDashoffset}
    transform="rotate(-90 12 12)"
    style="transition: stroke-dashoffset 0.3s ease;"
  />

  <!-- Download arrow icon -->
  <g transform="translate(12, 12)">
    <!-- Vertical line -->
    <path d="M 0 -5 L 0 3" stroke={fill} stroke-width="2" stroke-linecap="round" />

    <!-- Arrow head (chevron style) -->
    <path
      d="M -4 0 L 0 4 L 4 0"
      stroke={fill}
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
  </g>
</svg>
