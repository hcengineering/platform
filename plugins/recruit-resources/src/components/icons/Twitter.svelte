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
    d="M5,14.8c-1.8,0-3.6-0.6-5-1.5c1.2,0.1,3.4-0.1,4.8-1.4c-2-0.1-3-1.7-3.1-2.4c0.2,0.1,1,0.2,1.5,0C0.8,8.8,0.5,6.7,0.5,6 C1,6.3,1.7,6.4,2,6.4c-2.2-1.6-1.4-4-1-4.5c1.6,2.2,3.9,3.5,6.8,3.6C7.7,5.2,7.7,4.9,7.7,4.7c0-1.9,1.5-3.4,3.3-3.4 c1,0,1.8,0.4,2.4,1.1c0.6-0.2,1.6-0.5,2.1-0.8c-0.2,0.9-1,1.6-1.4,1.9c0,0,0,0,0,0c0.4-0.1,1.5-0.3,1.9-0.6c-0.2,0.5-1,1.3-1.6,1.8 C14.5,10,10.4,14.8,5,14.8z"
  />
</svg>
