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
  <path d="M8,16c-1.1,0-2.3-0.2-3.4-0.7C4.3,15.1,4,15,3.8,15c-0.2,0-0.6,0.1-0.9,0.2c-0.6,0.2-1.5,0.5-2.1-0.1 S0.5,13.7,0.8,13C0.9,12.7,1,12.4,1,12.2c0-0.2-0.1-0.4-0.2-0.8c-1.4-3-0.7-6.6,1.6-9C3.9,0.8,5.9,0,8,0c2.1,0,4.1,0.8,5.7,2.3 c3.1,3.1,3.1,8.2,0,11.3l0,0C12.1,15.2,10.1,16,8,16z M3.8,13.8c0.4,0,0.9,0.2,1.3,0.3c2.6,1.2,5.7,0.7,7.7-1.3 c2.6-2.6,2.6-6.9,0-9.6c-1.3-1.3-3-2-4.8-2c-1.8,0-3.5,0.7-4.8,2c-2,2-2.5,5.1-1.4,7.6c0.2,0.4,0.3,0.9,0.3,1.3 c0,0.4-0.2,0.9-0.3,1.3c-0.1,0.2-0.3,0.8-0.2,0.8c0.1,0.1,0.6-0.1,0.8-0.2C3,13.9,3.4,13.8,3.8,13.8z M13.2,13.2L13.2,13.2 L13.2,13.2z"/>
</svg>
