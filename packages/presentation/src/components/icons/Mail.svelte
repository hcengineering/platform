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
  const fill: string = 'var(--theme-caption-color)'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M12.9,2.7H3.1c-1,0-1.7,0.8-1.7,1.7v7.5c0,1,0.8,1.7,1.7,1.7h9.9c1,0,1.7-0.8,1.7-1.7V4.4C14.7,3.5,13.9,2.7,12.9,2.7z M12.9,3.7c0.1,0,0.2,0,0.3,0.1L8,7.9L2.8,3.8c0.1,0,0.2-0.1,0.3-0.1H12.9z M12.9,12.6H3.1c-0.4,0-0.7-0.3-0.7-0.7V4.7L7.7,9 C7.8,9,7.9,9.1,8,9.1S8.2,9,8.3,9l5.4-4.3v7.2C13.7,12.3,13.3,12.6,12.9,12.6z"/>
</svg>
