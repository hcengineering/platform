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
  <g>
    <path
      d="M8,3.7c-1.9,0-3.4,1.5-3.4,3.4s1.5,3.4,3.4,3.4s3.4-1.5,3.4-3.4S9.9,3.7,8,3.7z M8,9.3c-1.2,0-2.1-1-2.1-2.1 C5.9,6,6.8,5,8,5s2.1,1,2.1,2.1C10.1,8.3,9.2,9.3,8,9.3z"
    />
    <path
      d="M8,0C4.1,0,0.9,3.2,0.9,7.1c0,2.5,1.2,4.4,2.6,5.9c1.4,1.4,2.9,2.4,3.7,2.8c0.5,0.3,1.1,0.3,1.6,0 c0.8-0.4,2.4-1.4,3.7-2.8c1.4-1.4,2.6-3.4,2.6-5.9C15.1,3.2,11.9,0,8,0z M11.6,12.1c-1.2,1.3-2.7,2.1-3.4,2.5 c-0.1,0.1-0.3,0.1-0.4,0c-0.7-0.4-2.2-1.3-3.4-2.5c-1.2-1.3-2.2-2.9-2.2-5c0-3.2,2.6-5.8,5.8-5.8s5.8,2.6,5.8,5.8 C13.8,9.2,12.8,10.8,11.6,12.1z"
    />
  </g>
</svg>
