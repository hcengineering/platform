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
  <svg {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <g>
      <path d="M9.6,14.4c-1.8,0-7.4,0-7.4,3.4c0,3,4.2,3.4,7.4,3.4c1.8,0,7.4,0,7.4-3.4C17.1,14.7,12.8,14.4,9.6,14.4z M9.6,20c-4.1,0-6.2-0.7-6.2-2.2c0-1.5,2.1-2.2,6.2-2.2s6.2,0.7,6.2,2.2C15.9,19.2,13.8,20,9.6,20z"/>
      <path d="M9.6,12.4C9.6,12.4,9.7,12.4,9.6,12.4c1.4,0,2.6-0.5,3.5-1.5c0.9-0.9,1.4-2.2,1.4-3.5c0-2.7-2.2-5-5-5 c-2.7,0-5,2.2-5,5C4.7,10.1,6.9,12.4,9.6,12.4z M9.6,3.6c2.1,0,3.8,1.7,3.8,3.8c0,1-0.4,2-1.1,2.7c-0.7,0.7-1.7,1.1-2.7,1.1h0 c-2.1,0-3.8-1.7-3.8-3.8C5.9,5.3,7.6,3.6,9.6,3.6z"/>
      <path d="M16.5,10c-0.3,0-0.6,0.3-0.5,0.7c0,0.3,0.3,0.5,0.6,0.5c0,0,0.1,0,0.1,0C18.5,11,20,9.3,20,7.4 c0-1.9-1.4-3.5-3.3-3.8C16.4,3.5,16.1,3.7,16,4c-0.1,0.3,0.2,0.6,0.5,0.7c1.3,0.2,2.3,1.3,2.3,2.7C18.8,8.7,17.8,9.9,16.5,10z"/>
      <path d="M18.7,13.9c-0.3,0-0.6,0.2-0.7,0.5s0.2,0.6,0.5,0.7c2.1,0.3,2.1,1.1,2.1,1.3c0,0.3-0.1,0.7-0.9,1 c-0.3,0.1-0.5,0.5-0.3,0.8c0.1,0.2,0.3,0.4,0.6,0.4c0.1,0,0.1,0,0.2,0c1.4-0.5,1.7-1.5,1.7-2.1C21.9,15,20.8,14.2,18.7,13.9z"/>
    </g>
  </svg>
</IconSize>
