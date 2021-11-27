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

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M12.9,2.1h-1.5C11.2,0.9,10.2,0,9,0H7C5.8,0,4.8,0.9,4.6,2.1H3.1C1.4,2.1,0,3.5,0,5.2V8c0,0.2,0.1,0.5,0.3,0.6 c2.1,1.3,4.8,2,7.7,2c2.8,0,5.6-0.7,7.7-2C15.9,8.4,16,8.2,16,8V5.2C16,3.5,14.6,2.1,12.9,2.1z M7,1.3h2c0.5,0,0.9,0.3,1,0.7H6 C6.1,1.6,6.5,1.3,7,1.3z M14.7,7.6c-1.9,1-4.2,1.6-6.7,1.6c-2.4,0-4.8-0.6-6.7-1.6V5.2c0-1,0.8-1.8,1.8-1.8h9.8 c1,0,1.8,0.8,1.8,1.8V7.6z"
  />
  <path
    d="M15.4,10.2c-0.4,0-0.7,0.2-0.7,0.6l-0.1,2c-0.1,1-0.9,1.8-1.9,1.8H3.4c-1,0-1.8-0.8-1.9-1.8l-0.2-2 c0-0.4-0.3-0.6-0.7-0.6C0.3,10.3,0,10.6,0,11l0.2,2c0.1,1.7,1.5,3,3.2,3h9.2c1.7,0,3.1-1.3,3.2-3l0.1-2 C16,10.6,15.7,10.3,15.4,10.2z"
  />
</svg>
