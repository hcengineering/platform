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

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
  <path
    d="M5.8,9.7c1.5,0,2.7-1.1,2.9-2.5h7.9c0.3,0,0.5-0.2,0.5-0.5s-0.2-0.5-0.5-0.5H8.8C8.5,4.8,7.3,3.7,5.8,3.7c-1.7,0-3,1.3-3,3S4.2,9.7,5.8,9.7z M5.8,4.7c1.1,0,2,0.9,2,2s-0.9,2-2,2s-2-0.9-2-2S4.7,4.7,5.8,4.7z"
  />
  <path
    d="M14.2,10.3c-1.5,0-2.7,1.1-2.9,2.5H3.3c-0.3,0-0.5,0.2-0.5,0.5s0.2,0.5,0.5,0.5h7.9c0.2,1.4,1.5,2.5,2.9,2.5c1.7,0,3-1.3,3-3S15.8,10.3,14.2,10.3z M14.2,15.3c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S15.3,15.3,14.2,15.3z"
  />
</svg>
