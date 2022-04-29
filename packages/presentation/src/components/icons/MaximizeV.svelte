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

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M11.3,6.3L8.8,8.8C8.6,9,8.5,9.2,8.5,9.5s0.1,0.5,0.3,0.7s0.4,0.3,0.7,0.3s0.5-0.1,0.7-0.3L11,9.4v5.2l-0.8-0.8 c-0.2-0.2-0.4-0.3-0.7-0.3S9,13.6,8.8,13.8s-0.3,0.4-0.3,0.7s0.1,0.5,0.3,0.7l2.5,2.5c0.1,0.1,0.2,0.2,0.3,0.2 c0.2,0.1,0.5,0.1,0.8,0c0.1,0,0.2-0.1,0.3-0.2l2.5-2.5c0.1-0.1,0.2-0.2,0.2-0.3c0.1-0.1,0.1-0.3,0.1-0.4s0-0.3-0.1-0.4 c-0.1-0.1-0.1-0.2-0.2-0.3c-0.1-0.1-0.2-0.2-0.3-0.2c-0.1-0.1-0.3-0.1-0.4-0.1s-0.3,0-0.4,0.1c-0.1,0.1-0.2,0.1-0.3,0.2L13,14.6V9.4 l0.8,0.8c0.1,0.1,0.2,0.2,0.3,0.2c0.1,0.1,0.3,0.1,0.4,0.1s0.3,0,0.4-0.1c0.1-0.1,0.2-0.1,0.3-0.2c0.1-0.1,0.2-0.2,0.2-0.3 c0.1-0.1,0.1-0.3,0.1-0.4s0-0.3-0.1-0.4c-0.1-0.1-0.1-0.2-0.2-0.3l-2.5-2.5c-0.1-0.1-0.2-0.2-0.3-0.2c-0.2-0.1-0.5-0.1-0.8,0 C11.5,6.1,11.4,6.2,11.3,6.3z M6,21c0,0.3,0.1,0.5,0.3,0.7C6.5,21.9,6.7,22,7,22h10c0.3,0,0.5-0.1,0.7-0.3c0.2-0.2,0.3-0.4,0.3-0.7 s-0.1-0.5-0.3-0.7C17.5,20.1,17.3,20,17,20H7c-0.3,0-0.5,0.1-0.7,0.3C6.1,20.5,6,20.7,6,21z M6,3c0,0.3,0.1,0.5,0.3,0.7 C6.5,3.9,6.7,4,7,4h10c0.3,0,0.5-0.1,0.7-0.3S18,3.3,18,3s-0.1-0.5-0.3-0.7S17.3,2,17,2H7C6.7,2,6.5,2.1,6.3,2.3C6.1,2.5,6,2.7,6,3z"
  />
</svg>
