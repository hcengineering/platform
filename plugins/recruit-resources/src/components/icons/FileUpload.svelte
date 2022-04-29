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

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path
    d="M11.2,0C11.2,0,11.2,0,11.2,0H6C6,0,6,0,6,0s0,0-0.1,0H5.8C5.7,0,5.5,0.1,5.4,0.2L1.3,4.5C1.2,4.6,1.2,4.7,1.2,4.8v7.5 c0,2,1.5,3.6,3.5,3.7h6.5c0,0,0.1,0,0.1,0c2,0,3.6-1.7,3.5-3.7V3.5C14.8,1.6,13.2,0,11.2,0z M5.5,1.4v1.6c0,1-0.7,1.8-1.6,1.8H2.2 L5.5,1.4z M13.9,12.4c0,1.5-1.1,2.7-2.7,2.7H4.7c-1.5-0.1-2.6-1.2-2.6-2.7V5.8h1.8c1.4,0,2.6-1.2,2.6-2.8V1h4.8c0,0,0,0,0,0 c1.4,0,2.6,1.2,2.7,2.6V12.4z"
  />
  <path
    d="M8.3,5.8L8.3,5.8c0,0-0.1-0.1-0.2-0.1c0,0,0,0,0,0c-0.1,0-0.1,0-0.2,0c0,0-0.1,0-0.1,0c0,0,0,0,0,0c-0.1,0-0.1,0.1-0.2,0.1 c0,0,0,0,0,0L5.6,7.9c-0.2,0.2-0.2,0.5,0,0.7c0.2,0.2,0.5,0.2,0.7,0l1.3-1.3v4.2C7.5,11.8,7.7,12,8,12c0.3,0,0.5-0.2,0.5-0.5V7.3 l1.3,1.3c0.1,0.1,0.2,0.1,0.3,0.1s0.2,0,0.3-0.1c0.2-0.2,0.2-0.5,0-0.7L8.3,5.8z"
  />
</svg>
