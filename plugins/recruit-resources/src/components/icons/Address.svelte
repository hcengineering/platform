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
  const fill: string = 'var(--theme-caption-color)'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M14.8,5.1c-0.3-0.7-0.9-1.1-1.8-2l-0.9-0.8C10.4,0.8,9.4,0,8.2,0s-2.1,0.8-4,2.3l-1,0.9C2.2,4,1.6,4.4,1.3,5.1 S0.9,6.4,0.9,7.8v3.9c0,1.9,0,2.9,0.7,3.6C2.4,16,3.4,16,5.3,16h0.4l0,0l0,0h4.7l0,0l0,0h0.4c1.9,0,2.9,0,3.6-0.7s0.7-1.7,0.7-3.6 V7.9C15.1,6.6,15.1,5.8,14.8,5.1z M9.8,14.9H6.3V11c0-0.3,0.2-0.6,0.6-0.6h2.4c0.3,0,0.6,0.2,0.6,0.6C9.8,11,9.8,14.9,9.8,14.9z M13.9,11.8c0,1.7,0,2.4-0.3,2.8c-0.3,0.3-1.1,0.3-2.7,0.3V11c0-0.9-0.8-1.7-1.7-1.7H6.8c-0.9,0-1.7,0.8-1.7,1.7v3.9 c-1.6,0-2.3,0-2.7-0.3c-0.3-0.3-0.3-1.1-0.3-2.8V7.9c0-1.2,0-1.8,0.2-2.2c0.2-0.4,0.7-0.8,1.6-1.6l0.9-0.8c1.6-1.4,2.4-2.2,3.2-2.2 c0.8,0,1.7,0.7,3.2,2.1L12.2,4c0.9,0.8,1.3,1.1,1.6,1.6c0.2,0.4,0.2,1,0.2,2.2C13.9,7.8,13.9,11.8,13.9,11.8z"
  />
</svg>
