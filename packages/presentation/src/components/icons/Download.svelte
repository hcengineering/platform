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

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M18.7,9.6C18.5,6,15.6,3.2,12,3.2C8.4,3.2,5.5,6,5.3,9.5c-2.3,0.7-4,2.9-4,5.5c0,3.2,2.6,5.8,5.8,5.8 c0.5,0,1.1-0.1,1.6-0.2C9,20.4,9.2,20,9.1,19.6S8.6,19,8.2,19.1c-0.4,0.1-0.8,0.2-1.2,0.2c-2.3,0-4.2-1.9-4.2-4.2 c0-2,1.4-3.7,3.3-4.1c0.2,0,0.3-0.1,0.4-0.2c0.2-0.1,0.4-0.4,0.4-0.6c0-2.9,2.4-5.2,5.2-5.2s5.2,2.4,5.2,5.2c0,0.1,0,0.1,0,0.2 c0,0.3,0.2,0.6,0.6,0.7c1.9,0.4,3.3,2.1,3.3,4.1c0,2.3-1.9,4.2-4.2,4.2c-0.4,0-0.8-0.1-1.2-0.2c-0.4-0.1-0.8,0.1-0.9,0.5 c-0.1,0.4,0.1,0.8,0.5,0.9c0.5,0.1,1,0.2,1.6,0.2c3.2,0,5.8-2.6,5.8-5.8C22.6,12.5,21,10.4,18.7,9.6z"
  />
  <path
    d="M16.1,14.5c-0.3-0.3-0.8-0.3-1.1,0l-2.3,2.3V10c0-0.4-0.3-0.8-0.8-0.8s-0.8,0.3-0.8,0.8v6.7l-2.2-2.2 c-0.3-0.3-0.8-0.3-1.1,0c-0.3,0.3-0.3,0.8,0,1.1l3.5,3.5c0.3,0.3,0.8,0.3,1.1,0l3.6-3.5C16.4,15.2,16.4,14.8,16.1,14.5z"
  />
</svg>
