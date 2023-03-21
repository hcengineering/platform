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
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M19,9.8c-0.4,0-0.8,0.3-0.8,0.8V20c0,0.1-0.1,0.2-0.2,0.2H4c-0.1,0-0.2-0.1-0.2-0.2V6c0-0.1,0.1-0.2,0.2-0.2h9.2C13.6,5.8,14,5.5,14,5s-0.3-0.8-0.8-0.8H4C3,4.2,2.2,5,2.2,6v14c0,1,0.8,1.8,1.8,1.8h14c1,0,1.8-0.8,1.8-1.8v-9.5C19.8,10.1,19.4,9.8,19,9.8z"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M21,4.2h-1.3V2.9c0-0.4-0.3-0.8-0.8-0.8c-0.4,0-0.8,0.3-0.8,0.8v1.4H17c-0.4,0-0.8,0.3-0.8,0.8s0.3,0.8,0.8,0.8h1.2V7c0,0.4,0.3,0.8,0.8,0.8c0.4,0,0.8-0.3,0.8-0.8V5.8H21c0.4,0,0.8-0.3,0.8-0.8S21.4,4.2,21,4.2z"
  />
  <path
    d="M16.2,12.1l-4.4-4.4c-0.2-0.2-0.5-0.3-0.8-0.2c-0.3,0.1-0.5,0.4-0.5,0.7v2c-1.6,0.2-2.9,0.9-3.7,2.2c-0.8,1.2-1.2,3-1.2,5.4c0,0.4,0.3,0.7,0.6,0.7c0,0,0.1,0,0.1,0c0.3,0,0.6-0.2,0.7-0.5l0-0.1c0-0.1,0.1-0.2,0.2-0.4c0.2-0.3,0.4-0.7,0.8-1.1c0.7-0.8,1.5-1.3,2.4-1.5v1.9c0,0.3,0.2,0.6,0.4,0.7c0.3,0.1,0.6,0.1,0.8-0.1l4.4-4.1c0.1-0.1,0.2-0.3,0.2-0.5C16.4,12.4,16.3,12.3,16.2,12.1z M12,10.9V10l2.6,2.6L12,15.1v-1c0-0.4-0.3-0.7-0.7-0.7c-1.8,0-3,0.8-3.9,1.7c0.2-0.7,0.4-1.4,0.7-1.8c0.7-1,1.7-1.5,3.2-1.5C11.7,11.7,12,11.3,12,10.9z"
  />
</svg>
