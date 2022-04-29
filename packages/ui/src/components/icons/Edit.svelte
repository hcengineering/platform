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
  <path d="M14,13.1H9.2c-0.3,0-0.5,0.2-0.5,0.5s0.2,0.5,0.5,0.5H14c0.3,0,0.5-0.2,0.5-0.5S14.3,13.1,14,13.1z" />
  <path
    d="M11.4,7.1C11.4,7.1,11.4,7.1,11.4,7.1c1.2-1.6,1.3-1.6,1.3-1.6C12.9,5,13,4.5,12.9,4c-0.1-0.5-0.4-0.9-0.8-1.2 c0,0-1.1-0.9-1.1-0.9c-0.8-0.7-2.1-0.6-2.8,0.3c0,0,0,0,0,0l-6.3,7.9c-0.3,0.4-0.4,0.9-0.3,1.4l0.5,2.3c0.1,0.2,0.3,0.4,0.5,0.4 c0,0,0,0,0,0l2.4,0c0.5,0,1-0.2,1.3-0.6C8.9,10.2,10.5,8.2,11.4,7.1C11.4,7.1,11.4,7.1,11.4,7.1z M8.9,2.8c0.3-0.4,1-0.5,1.4-0.1 c0,0,1.2,0.9,1.2,0.9c0.2,0.1,0.4,0.3,0.4,0.6c0.1,0.2,0,0.5-0.1,0.7c0,0-0.4,0.5-0.9,1.2L8.1,3.9L8.9,2.8z M5.5,12.9 C5.4,13,5.2,13.1,5,13.1l-2,0l-0.5-1.9c0-0.2,0-0.4,0.1-0.5l4.8-6l2.8,2.2C8.9,8.6,6.8,11.2,5.5,12.9z"
  />
</svg>
