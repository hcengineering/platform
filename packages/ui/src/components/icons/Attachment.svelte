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
    d="M3,8.5L8.1,3c1.1-1.2,2.9-1.2,4,0c1.1,1.2,1.1,3,0,4.2l-5.9,6.3c-0.4,0.5-1.1,0.5-1.6,0c-0.4-0.5-0.4-1.2,0-1.7l5.9-6.3c0.2-0.2,0.2-0.6,0-0.8c-0.2-0.2-0.6-0.2-0.8,0L3.7,11c-0.9,0.9-0.9,2.4,0,3.3c0.9,0.9,2.3,0.9,3.2,0l5.9-6.3c1.5-1.6,1.5-4.2,0-5.8c-1.5-1.6-4-1.6-5.5,0L2.2,7.6c-0.2,0.2-0.2,0.6,0,0.8C2.4,8.7,2.7,8.7,3,8.5z"
  />
</svg>
