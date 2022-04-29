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

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M13.5,13H13V5c0-0.2-0.2-0.4-0.4-0.5L7.1,3C7,3,6.8,3,6.7,3.1C6.6,3.2,6.5,3.3,6.5,3.5V6h-3C3.2,6,3,6.2,3,6.5V13H2.5 C2.2,13,2,13.2,2,13.5S2.2,14,2.5,14h11c0.3,0,0.5-0.2,0.5-0.5S13.8,13,13.5,13z M4,13V7h4.5v6H4z M9,6H7.5V4.2L12,5.4V13H9.5V6.5 C9.5,6.2,9.3,6,9,6z"
  />
</svg>
