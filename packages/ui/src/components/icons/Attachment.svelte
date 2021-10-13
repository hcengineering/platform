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
  <path d="M2.2,8.5l5.9-6.2c1.2-1.3,3.3-1.3,4.5,0c1.2,1.3,1.2,3.5,0,4.8l-6.8,7.2c-0.5,0.5-1.3,0.5-1.8,0 c-0.5-0.5-0.5-1.4,0-1.9l6.8-7.2c0.2-0.3,0.2-0.7,0-1C10.6,4,10.2,4,9.9,4.2l-6.8,7.2c-1,1.1-1,2.8,0,3.8c1,1.1,2.6,1.1,3.6,0 l6.8-7.2c1.7-1.8,1.7-4.8,0-6.7c-1.7-1.8-4.6-1.8-6.3,0L1.3,7.6c-0.2,0.3-0.2,0.7,0,1C1.6,8.8,2,8.8,2.2,8.5z"/>
</svg>
