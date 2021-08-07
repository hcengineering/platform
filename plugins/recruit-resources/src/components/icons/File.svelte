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
  <svg {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
    <path d="M15.7,2.6C15.1,2,14.2,2,12.5,2H9.9C9.5,2,9.2,2,9,2.1S8.6,2.4,8.3,2.6l-4,4C4,6.9,3.9,7.1,3.8,7.3C3.7,7.6,3.7,7.8,3.7,8.2 v6c0,1.7,0,2.6,0.6,3.2S5.8,18,7.5,18h5c1.7,0,2.6,0,3.2-0.6s0.6-1.5,0.6-3.2V5.8C16.3,4.2,16.3,3.3,15.7,2.6z M5,7.4l4-4 C9.2,3.2,9.3,3.1,9.4,3c0,0,0.1,0,0.1,0v3.4c0,0.7,0,1.2-0.1,1.3C9.2,7.8,8.8,7.8,8.1,7.8H4.7c0,0,0-0.1,0-0.1 C4.7,7.7,4.8,7.5,5,7.4z M15.3,14.2c0,1.5,0,2.2-0.3,2.5S14,17,12.5,17h-5C6,17,5.3,17,5,16.7s-0.3-1-0.3-2.5V8.8h3.4 c1,0,1.6,0,2-0.4c0.4-0.4,0.4-1,0.4-2V3h2C14,3,14.7,3,15,3.3s0.3,1,0.3,2.5V14.2z"/>
  </svg>
</IconSize>
