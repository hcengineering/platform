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
  export let size: 'x-small' | 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M11.7,3.6h-1.1C10.4,2.7,9.7,2,8.8,2H7.2C6.3,2,5.6,2.7,5.4,3.6H4.3C3,3.6,2,4.6,2,5.9V8c0,0.2,0.1,0.3,0.2,0.4 C3.8,9.3,5.9,9.9,8,9.9c2.1,0,4.2-0.5,5.8-1.5C13.9,8.3,14,8.2,14,8V5.9C14,4.6,13,3.6,11.7,3.6z M7.2,3h1.5c0.4,0,0.6,0.2,0.8,0.6 H6.5C6.6,3.2,6.9,3,7.2,3z M13,7.7c-1.4,0.8-3.2,1.2-5,1.2c-1.8,0-3.6-0.4-5-1.2V5.9c0-0.7,0.6-1.3,1.3-1.3h7.4 c0.7,0,1.3,0.6,1.3,1.3V7.7z"
  />
  <path
    d="M13.5,9.7c-0.3,0-0.5,0.2-0.5,0.5l-0.1,1.5c-0.1,0.8-0.7,1.3-1.4,1.3H4.5c-0.7,0-1.4-0.6-1.4-1.3L3,10.1 c0-0.3-0.3-0.5-0.5-0.5C2.2,9.7,2,9.9,2,10.2l0.1,1.5C2.2,13,3.3,14,4.5,14h6.9c1.3,0,2.3-1,2.4-2.3l0.1-1.5 C14,9.9,13.8,9.7,13.5,9.7z"
  />
</svg>
