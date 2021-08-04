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
  import IconSize from '../IconSize.svelte'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = '#4474F6'
</script>

<IconSize {size}>
  <svg {fill} xmlns="http://www.w3.org/2000/svg">
    <path d="M10,0C4.5,0,0,4.5,0,10s4.5,10,10,10s10-4.5,10-10S15.5,0,10,0z M13.7,8l-4,5c-0.1,0.1-0.3,0.2-0.5,0.2 S8.8,13.1,8.6,13l-2.3-2.5C6,10.2,6,9.7,6.3,9.4c0.3-0.3,0.8-0.3,1.1,0l1.7,1.9L12.5,7c0.3-0.3,0.7-0.4,1.1-0.1 C13.9,7.2,14,7.6,13.7,8z"/>
  </svg>
</IconSize>
