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

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path
    d="M13.1,5.2c-0.1-0.2-0.2-0.4-0.4-0.6L10.1,2C9.9,1.8,9.7,1.7,9.5,1.6C9.3,1.5,9.1,1.5,8.8,1.5H6c-1.3,0-2.1,0-2.6,0.5 S2.8,3.3,2.8,4.7v6.7c0,1.3,0,2.1,0.5,2.6s1.3,0.5,2.6,0.5h4c1.3,0,2.1,0,2.6-0.5c0.5-0.5,0.5-1.3,0.5-2.6V5.9 C13.2,5.6,13.2,5.4,13.1,5.2z M11.9,5.3c0.1,0.1,0.2,0.2,0.2,0.2H10c-0.3,0-0.7,0-0.8,0c0-0.1,0-0.5,0-0.8V2.5 c0.1,0,0.1,0.1,0.2,0.2L11.9,5.3z M11.9,13.3c-0.2,0.2-0.8,0.2-1.9,0.2H6c-1.2,0-1.7,0-1.9-0.2s-0.2-0.8-0.2-1.9V4.7 c0-1.2,0-1.7,0.2-1.9S4.8,2.5,6,2.5h2.2v2.2c0,0.7,0,1.1,0.3,1.5S9.3,6.5,10,6.5h2.2v4.8C12.2,12.5,12.2,13,11.9,13.3z"
  />
</svg>
