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
  <path d="M13.7,2.3C12.2,0.8,10.1,0,8,0C5.9,0,3.9,0.8,2.3,2.3c-2.4,2.4-3,6-1.6,9C0.9,11.7,1,12,1,12.2 c0,0.2-0.1,0.6-0.2,0.9c-0.2,0.6-0.5,1.5,0.1,2.1c0.6,0.6,1.5,0.3,2.1,0.1C3.3,15.1,3.6,15,3.8,15c0.2,0,0.5,0.1,0.8,0.2 C5.7,15.8,6.8,16,8,16c2.1,0,4.1-0.8,5.7-2.3C16.8,10.5,16.8,5.5,13.7,2.3z M12.8,12.8c-2,2-5.1,2.5-7.7,1.3 c-0.4-0.2-0.8-0.3-1.3-0.3c-0.4,0-0.9,0.2-1.3,0.3c-0.2,0.1-0.8,0.3-0.8,0.2c-0.1-0.1,0.1-0.6,0.2-0.8c0.1-0.4,0.3-0.8,0.3-1.3 c0-0.4-0.2-0.9-0.3-1.3C0.7,8.3,1.2,5.2,3.2,3.2c1.3-1.3,3-2,4.8-2c1.8,0,3.5,0.7,4.8,2C15.4,5.9,15.4,10.1,12.8,12.8z"/>
</svg>
