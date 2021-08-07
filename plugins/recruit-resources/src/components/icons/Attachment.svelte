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
    <path d="M4.8,10.5l5.7-5.7c1.2-1.2,3.1-1.2,4.2,0s1.2,3.1,0,4.2L8,15.8c-0.6,0.6-1.5,0.6-2.1,0c-0.6-0.6-0.6-1.5,0-2.1l6-6 c0.2-0.2,0.2-0.5,0-0.7c-0.2-0.2-0.5-0.2-0.7,0l-6,6c-1,1-1,2.6,0,3.5c1,1,2.6,1,3.5,0l6.7-6.7c1.6-1.6,1.6-4.1,0-5.7 s-4.1-1.6-5.7,0L4.1,9.8c-0.2,0.2-0.2,0.5,0,0.7C4.3,10.7,4.6,10.7,4.8,10.5z"/>
  </svg>
</IconSize>
