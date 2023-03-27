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

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M15,14.2H9.4c-0.2,0-0.4,0.2-0.4,0.4S9.1,15,9.4,15H15c0.2,0,0.4-0.2,0.4-0.4S15.2,14.2,15,14.2z" />
  <path
    d="M11.8,6.8C11.8,6.8,11.8,6.8,11.8,6.8C13.2,5,13.3,5,13.3,5c0.3-0.5,0.4-1,0.3-1.6c-0.1-0.5-0.5-1-0.9-1.3c0,0-1.3-1-1.3-1c-0.9-0.7-2.2-0.6-3,0.3c0,0,0,0,0,0L1,10.5c-0.3,0.4-0.4,0.9-0.3,1.4l0.6,2.7c0,0.2,0.2,0.3,0.4,0.3c0,0,0,0,0,0l2.8,0c0.5,0,1-0.2,1.3-0.6C8.9,10.4,10.7,8.2,11.8,6.8C11.8,6.8,11.8,6.8,11.8,6.8z"
  />
</svg>
