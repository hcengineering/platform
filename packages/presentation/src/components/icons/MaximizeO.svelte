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
    d="M9.3,13.3L4,18.6V17c0-0.3-0.1-0.5-0.3-0.7C3.5,16.1,3.3,16,3,16s-0.5,0.1-0.7,0.3C2.1,16.5,2,16.7,2,17v4 c0,0.1,0,0.3,0.1,0.4c0.1,0.2,0.3,0.4,0.5,0.5C2.7,22,2.9,22,3,22h4c0.3,0,0.5-0.1,0.7-0.3C7.9,21.5,8,21.3,8,21s-0.1-0.5-0.3-0.7 C7.5,20.1,7.3,20,7,20H5.4l5.3-5.3c0.2-0.2,0.3-0.4,0.3-0.7s-0.1-0.5-0.3-0.7S10.3,13,10,13S9.5,13.1,9.3,13.3z M5.4,4H7 c0.3,0,0.5-0.1,0.7-0.3C7.9,3.5,8,3.3,8,3S7.9,2.5,7.7,2.3C7.5,2.1,7.3,2,7,2H3C2.9,2,2.7,2,2.6,2.1C2.4,2.2,2.2,2.4,2.1,2.6 C2,2.7,2,2.9,2,3v4c0,0.3,0.1,0.5,0.3,0.7C2.5,7.9,2.7,8,3,8s0.5-0.1,0.7-0.3C3.9,7.5,4,7.3,4,7V5.4l5.3,5.3 c0.1,0.1,0.2,0.2,0.3,0.2C9.7,11,9.9,11,10,11c0.1,0,0.3,0,0.4-0.1c0.1-0.1,0.2-0.1,0.3-0.2c0.1-0.1,0.2-0.2,0.2-0.3 C11,10.3,11,10.1,11,10c0-0.1,0-0.3-0.1-0.4c-0.1-0.1-0.1-0.2-0.2-0.3L5.4,4z M21,16c-0.3,0-0.5,0.1-0.7,0.3S20,16.7,20,17v1.6 l-5.3-5.3C14.5,13.1,14.3,13,14,13s-0.5,0.1-0.7,0.3S13,13.7,13,14s0.1,0.5,0.3,0.7l5.3,5.3H17c-0.3,0-0.5,0.1-0.7,0.3 S16,20.7,16,21s0.1,0.5,0.3,0.7S16.7,22,17,22h4c0.1,0,0.3,0,0.4-0.1c0.2-0.1,0.4-0.3,0.5-0.5C22,21.3,22,21.1,22,21v-4 c0-0.3-0.1-0.5-0.3-0.7S21.3,16,21,16z M21.9,2.6c-0.1-0.2-0.3-0.4-0.5-0.5C21.3,2,21.1,2,21,2h-4c-0.3,0-0.5,0.1-0.7,0.3 C16.1,2.5,16,2.7,16,3s0.1,0.5,0.3,0.7C16.5,3.9,16.7,4,17,4h1.6l-5.3,5.3c-0.1,0.1-0.2,0.2-0.2,0.3C13,9.7,13,9.9,13,10 c0,0.1,0,0.3,0.1,0.4c0.1,0.1,0.1,0.2,0.2,0.3c0.1,0.1,0.2,0.2,0.3,0.2C13.7,11,13.9,11,14,11s0.3,0,0.4-0.1 c0.1-0.1,0.2-0.1,0.3-0.2L20,5.4V7c0,0.3,0.1,0.5,0.3,0.7C20.5,7.9,20.7,8,21,8s0.5-0.1,0.7-0.3C21.9,7.5,22,7.3,22,7V3 C22,2.9,22,2.7,21.9,2.6z"
  />
</svg>
