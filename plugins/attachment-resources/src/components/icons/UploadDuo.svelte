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
    d="M18,6.4c-0.1,0-0.2,0-0.3,0c-0.1,0-0.1,0-0.1,0c-0.1,0-0.1,0-0.1,0c0,0,0,0-0.1-0.1c0,0,0,0-0.1-0.1 c0-0.1-0.1-0.2-0.2-0.4c-0.9-1.9-2.8-3.3-5.1-3.3c-2.3,0-4.2,1.4-5.1,3.3C6.8,5.9,6.7,6,6.7,6.1c0,0.1-0.1,0.1-0.1,0.1 C6.6,6.3,6.6,6.3,6.5,6.3c0,0,0,0-0.1,0c0,0,0,0-0.1,0c-0.1,0-0.2,0-0.3,0C4,6.4,2.4,8,2.4,10S4,13.6,6,13.6h6h6 c2,0,3.6-1.6,3.6-3.6S20,6.4,18,6.4z"
  />
  <g {fill}>
    <path
      d="M18,6.4c-0.1,0-0.2,0-0.3,0c-0.1,0-0.1,0-0.1,0c-0.1,0-0.1,0-0.1,0c0,0,0,0-0.1-0.1c0,0,0,0,0,0c0,0,0,0,0,0 c0,0,0,0,0,0c0,0,0,0,0,0c0,0,0,0-0.1-0.1c0-0.1-0.1-0.2-0.2-0.4c-0.9-1.9-2.8-3.3-5.1-3.3c-2.3,0-4.2,1.4-5.1,3.3 C6.8,5.9,6.7,6,6.7,6.1c0,0.1-0.1,0.1-0.1,0.1c0,0,0,0,0,0C6.6,6.3,6.6,6.3,6.5,6.3c0,0,0,0-0.1,0c0,0,0,0-0.1,0 c-0.1,0-0.2,0-0.3,0C4,6.4,2.4,8,2.4,10S4,13.6,6,13.6h0.6l1.2-1.2H6c-1.3,0-2.4-1.1-2.4-2.4c0-1.3,1.1-2.4,2.4-2.4h0.1 c0.2,0,0.4,0,0.6,0c0.2,0,0.4-0.1,0.6-0.2c0.2-0.1,0.3-0.3,0.4-0.4c0.1-0.1,0.1-0.2,0.2-0.3C7.8,6.5,7.9,6.4,8,6.2l0,0 c0.7-1.5,2.2-2.6,4-2.6s3.3,1.1,4,2.6l0,0c0.1,0.2,0.1,0.3,0.2,0.4c0,0.1,0.1,0.2,0.2,0.3c0.1,0.2,0.2,0.3,0.4,0.4 c0.2,0.1,0.4,0.2,0.6,0.2c0.2,0,0.4,0,0.6,0H18c1.3,0,2.4,1.1,2.4,2.4c0,1.3-1.1,2.4-2.4,2.4h-1.8l1.2,1.2H18c2,0,3.6-1.6,3.6-3.6 S20,6.4,18,6.4z"
    />
    <path d="M12,11.2l-4.4,4.4l0.8,0.8l3-3V21c0,0.3,0.3,0.6,0.6,0.6s0.6-0.3,0.6-0.6v-7.6l3,3l0.8-0.8L12,11.2z" />
  </g>
</svg>
