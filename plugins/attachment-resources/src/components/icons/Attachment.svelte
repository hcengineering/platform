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
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M15.4,5c1.5-1.5,3.8-1.5,5.3,0l-0.5,0.5L20.7,5c1.5,1.5,1.5,3.8,0,5.3l0,0l-8.8,8.8c-2.1,2.1-5.4,2.1-7.4,0l0.5-0.5l-0.5,0.5c-2.1-2.1-2.1-5.4,0-7.4l7.4-7.4c0.3-0.3,0.8-0.3,1.1,0c0.3,0.3,0.3,0.8,0,1.1l-7.4,7.4l-0.5-0.5l0.5,0.5C4,14.2,4,16.6,5.5,18l-0.5,0.5L5.5,18c1.5,1.5,3.8,1.5,5.3,0l0.5,0.5L10.8,18l8.8-8.8v0c0.9-0.9,0.9-2.3,0-3.2c-0.9-0.9-2.3-0.9-3.2,0v0l-8.8,8.8c-0.3,0.3-0.3,0.8,0,1.1c0.3,0.3,0.8,0.3,1.1,0l7.4-7.4c0.3-0.3,0.8-0.3,1.1,0c0.3,0.3,0.3,0.8,0,1.1L9.7,17c-0.9,0.9-2.3,0.9-3.2,0h0c-0.9-0.9-0.9-2.3,0-3.2h0L15.4,5C15.4,5,15.4,5,15.4,5z"
  />
</svg>
