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
  <path d="M8,8.4c2,0,3.6-1.6,3.6-3.6S10,1.2,8,1.2S4.4,2.8,4.4,4.8S6,8.4,8,8.4z" />
  <path d="M8,10.2c-2.9,0-5.4,0.5-5.4,2.3c0,1.9,2.5,2.3,5.4,2.3s5.4-0.5,5.4-2.3C13.3,10.6,10.9,10.2,8,10.2z" />
</svg>
