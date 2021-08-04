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
  import IconSize from '../../IconSize.svelte'
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'var(--theme-caption-color)'
</script>

<IconSize {size}>
  <svg viewBox="0 0 24 24" {fill} xmlns="http://www.w3.org/2000/svg">
    <path d="M12.8,12l7.6-7.6c0.2-0.2,0.2-0.6,0-0.8s-0.6-0.2-0.8,0L12,11.2L4.4,3.6c-0.2-0.2-0.6-0.2-0.8,0s-0.2,0.6,0,0.8 l7.6,7.6l-7.6,7.6c-0.2,0.2-0.2,0.6,0,0.8c0.1,0.1,0.3,0.2,0.4,0.2s0.3-0.1,0.4-0.2l7.6-7.6l7.6,7.6c0.1,0.1,0.3,0.2,0.4,0.2 s0.3-0.1,0.4-0.2c0.2-0.2,0.2-0.6,0-0.8L12.8,12z"/>
  </svg>
</IconSize>
