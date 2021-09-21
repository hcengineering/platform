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
  const fill: string = 'var(--theme-caption-color)'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M8,6.6C7.2,6.6,6.6,7.2,6.6,8S7.2,9.4,8,9.4c0.8,0,1.4-0.6,1.4-1.4S8.8,6.6,8,6.6z"/>
  <path d="M8,11.4c-0.8,0-1.4,0.6-1.4,1.4s0.6,1.4,1.4,1.4c0.8,0,1.4-0.6,1.4-1.4S8.8,11.4,8,11.4z"/>
  <path d="M8,4.6c0.8,0,1.4-0.6,1.4-1.4S8.7,1.8,8,1.8c-0.8,0-1.4,0.6-1.4,1.4S7.2,4.6,8,4.6z"/>
</svg>
