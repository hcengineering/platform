<!--
// Copyright © 2022 Hardcore Engineering Inc.
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

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path
    d="M20.7,5c-1.5-1.5-3.8-1.5-5.3,0l-8.8,8.8c-0.9,0.9-0.9,2.3,0,3.2c0.9,0.9,2.3,0.9,3.2,0l7.4-7.4 c0.3-0.3,0.3-0.8,0-1.1s-0.8-0.3-1.1,0l-7.4,7.4c-0.3,0.3-0.8,0.3-1.1,0c-0.3-0.3-0.3-0.8,0-1.1L16.4,6c0.9-0.9,2.3-0.9,3.2,0 s0.9,2.3,0,3.2L10.8,18c-1.5,1.5-3.8,1.5-5.3,0c-1.5-1.5-1.5-3.8,0-5.3l7.4-7.4c0.3-0.3,0.3-0.8,0-1.1c-0.3-0.3-0.8-0.3-1.1,0 l-7.4,7.4c-2.1,2.1-2.1,5.4,0,7.4c2.1,2.1,5.4,2.1,7.4,0l8.8-8.8C22.1,8.8,22.1,6.4,20.7,5z"
  />
</svg>
