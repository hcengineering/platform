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
  import { IconSize } from '@anticrm/ui'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg {fill} xmlns="http://www.w3.org/2000/svg">
    <path d="M16.1,8.2c-0.3-0.6-0.8-1-1.6-1.8l-0.8-0.7c-1.6-1.4-2.5-2.1-3.6-2.1c-1.1,0-1.9,0.7-3.6,2.1L5.6,6.5 C4.7,7.2,4.2,7.6,3.9,8.2c-0.3,0.6-0.3,1.2-0.3,2.4v3.5c0,1.7,0,2.6,0.6,3.2C4.9,18,5.8,18,7.5,18h0.4c0,0,0,0,0,0s0,0,0,0h4.2 c0,0,0,0,0,0s0,0,0,0h0.4c1.7,0,2.6,0,3.2-0.6c0.6-0.6,0.6-1.5,0.6-3.2v-3.5C16.3,9.5,16.3,8.8,16.1,8.2z M11.6,17H8.4v-3.5 c0-0.3,0.2-0.5,0.5-0.5h2.2c0.3,0,0.5,0.2,0.5,0.5V17z M15.3,14.2c0,1.5,0,2.2-0.3,2.5C14.7,17,14,17,12.6,17v-3.5 c0-0.8-0.7-1.5-1.5-1.5H8.9c-0.8,0-1.5,0.7-1.5,1.5V17C6,17,5.3,17,5,16.7c-0.3-0.3-0.3-1-0.3-2.5v-3.5c0-1.1,0-1.6,0.2-2 s0.6-0.7,1.4-1.4l0.8-0.7C8.5,5.3,9.3,4.6,10,4.6s1.5,0.6,2.9,1.9l0.8,0.7c0.8,0.7,1.2,1,1.4,1.4s0.2,0.9,0.2,2V14.2z"/>
  </svg>
</IconSize>
