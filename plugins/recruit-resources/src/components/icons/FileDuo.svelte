<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path
    fill="var(--duotone-color)"
    d="M13,7V3H9C7.1,3,6.2,3,5.6,3.6C5,4.2,5,5.1,5,7v10c0,1.9,0,2.8,0.6,3.4C6.2,21,7.1,21,9,21h6 c1.9,0,2.8,0,3.4-0.6S19,18.9,19,17V9h-4c-0.9,0-1.4,0-1.7-0.3C13,8.4,13,7.9,13,7z"
  />
  <g {fill}>
    <path d="M9,12.4c-0.3,0-0.6,0.3-0.6,0.6s0.3,0.6,0.6,0.6h6c0.3,0,0.6-0.3,0.6-0.6s-0.3-0.6-0.6-0.6H9z" />
    <path d="M13,16.4H9c-0.3,0-0.6,0.3-0.6,0.6s0.3,0.6,0.6,0.6h4c0.3,0,0.6-0.3,0.6-0.6S13.3,16.4,13,16.4z" />
    <path
      d="M19.5,7.8c-0.1-0.3-0.3-0.5-0.6-0.8L15,3.2c-0.3-0.3-0.5-0.5-0.8-0.6s-0.6-0.1-1-0.1H9c-2,0-3.1,0-3.8,0.8 C4.4,3.9,4.4,5,4.4,7v10c0,2,0,3.1,0.8,3.8C5.9,21.6,7,21.6,9,21.6h6c2,0,3.1,0,3.8-0.8s0.8-1.9,0.8-3.8V8.8 C19.6,8.4,19.6,8.1,19.5,7.8z M13.6,3.6c0.1,0,0.1,0,0.1,0c0.1,0,0.2,0.2,0.4,0.4L18,7.8c0.2,0.2,0.3,0.3,0.4,0.4c0,0,0,0.1,0,0.1 H15c-0.7,0-1.2,0-1.3-0.1S13.6,7.7,13.6,7V3.6z M18.4,17c0,1.8,0,2.6-0.4,3c-0.4,0.4-1.2,0.4-3,0.4H9c-1.8,0-2.6,0-3-0.4 c-0.4-0.4-0.4-1.2-0.4-3V7c0-1.8,0-2.6,0.4-3c0.4-0.4,1.2-0.4,3-0.4h3.4V7c0,1,0,1.7,0.5,2.1C13.3,9.6,14,9.6,15,9.6h3.4V17z"
    />
  </g>
</svg>
