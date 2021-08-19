<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import IconSize from '../../IconSize.svelte'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-content-color)'
</script>

<IconSize {size}>
  <svg {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g>
      <path d="M12,0C5.4,0,0,5.4,0,12c0,6.6,5.4,12,12,12c6.6,0,12-5.4,12-12C24,5.4,18.6,0,12,0z M12,23C5.9,23,1,18.1,1,12 S5.9,1,12,1s11,4.9,11,11S18.1,23,12,23z"/>
      <polygon points="12.6,14.4 12.8,5.1 11.2,5.1 11.4,14.4"/>
      <path d="M12,15.8c-0.6,0-1.2,0.5-1.2,1.2s0.5,1.2,1.2,1.2s1.2-0.5,1.2-1.2S12.6,15.8,12,15.8z"/>
    </g>
  </svg>
</IconSize>
