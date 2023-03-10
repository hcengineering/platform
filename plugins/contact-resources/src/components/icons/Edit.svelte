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
  const fill: string = 'var(--caption-color)'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M13.3,6.5l1.9-1.9c1.1-1.1,1.1-2.8,0-3.8c-1.1-1.1-2.8-1.1-3.8,0L9.5,2.7C10.4,4.3,11.7,5.6,13.3,6.5z M12.3,7.6c-1.6-1-2.9-2.3-3.8-3.8l-6.3,6.3l0,0C1.5,10.7,1.2,11,1,11.4c-0.2,0.4-0.3,0.8-0.5,1.6l-0.4,2c-0.1,0.5-0.1,0.7,0,0.9 c0.1,0.1,0.4,0.1,0.9,0l2-0.4c0.8-0.2,1.3-0.3,1.6-0.5c0.4-0.2,0.7-0.5,1.3-1.1L12.3,7.6z"
  />
</svg>
