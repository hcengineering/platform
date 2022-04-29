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
    d="M17.7,11.3l-2.5-2.5c-0.2-0.2-0.4-0.3-0.7-0.3S14,8.6,13.8,8.8s-0.3,0.4-0.3,0.7s0.1,0.5,0.3,0.7l0.8,0.8H9.4l0.8-0.8 c0.2-0.2,0.3-0.4,0.3-0.7S10.4,9,10.2,8.8S9.8,8.5,9.5,8.5S9,8.6,8.8,8.8l-2.5,2.5c-0.1,0.1-0.2,0.2-0.2,0.3c-0.1,0.2-0.1,0.5,0,0.8 c0,0.1,0.1,0.2,0.2,0.3l2.5,2.5c0.1,0.1,0.2,0.2,0.3,0.2c0.1,0.1,0.3,0.1,0.4,0.1s0.3,0,0.4-0.1c0.1-0.1,0.2-0.1,0.3-0.2 c0.1-0.1,0.2-0.2,0.2-0.3c0.1-0.1,0.1-0.3,0.1-0.4s0-0.3-0.1-0.4c-0.1-0.1-0.1-0.2-0.2-0.3L9.4,13h5.2l-0.8,0.8 c-0.1,0.1-0.2,0.2-0.2,0.3c-0.1,0.1-0.1,0.3-0.1,0.4s0,0.3,0.1,0.4c0.1,0.1,0.1,0.2,0.2,0.3c0.1,0.1,0.2,0.2,0.3,0.2 c0.1,0.1,0.3,0.1,0.4,0.1s0.3,0,0.4-0.1c0.1-0.1,0.2-0.1,0.3-0.2l2.5-2.5c0.1-0.1,0.2-0.2,0.2-0.3c0.1-0.2,0.1-0.5,0-0.8 C17.9,11.5,17.8,11.4,17.7,11.3z M3,6C2.7,6,2.5,6.1,2.3,6.3C2.1,6.5,2,6.7,2,7v10c0,0.3,0.1,0.5,0.3,0.7C2.5,17.9,2.7,18,3,18 s0.5-0.1,0.7-0.3C3.9,17.5,4,17.3,4,17V7c0-0.3-0.1-0.5-0.3-0.7C3.5,6.1,3.3,6,3,6z M21,6c-0.3,0-0.5,0.1-0.7,0.3 C20.1,6.5,20,6.7,20,7v10c0,0.3,0.1,0.5,0.3,0.7S20.7,18,21,18s0.5-0.1,0.7-0.3S22,17.3,22,17V7c0-0.3-0.1-0.5-0.3-0.7 C21.5,6.1,21.3,6,21,6z"
  />
</svg>
