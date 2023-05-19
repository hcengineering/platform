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
  export let size: 'x-small' | 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M14 6C13.4477 6 13 6.44772 13 7V8H19V7C19 6.44772 18.5523 6 18 6H14ZM21 8V7C21 5.34315 19.6569 4 18 4H14C12.3431 4 11 5.34315 11 7V8H6C3.79086 8 2 9.79086 2 12V24C2 26.2091 3.79086 28 6 28H26C28.2091 28 30 26.2091 30 24V12C30 9.79086 28.2091 8 26 8H21ZM6 10C4.89543 10 4 10.8954 4 12V16H28V12C28 10.8954 27.1046 10 26 10H6ZM28 18H17V19C17 19.5523 16.5523 20 16 20C15.4477 20 15 19.5523 15 19V18H4V24C4 25.1046 4.89543 26 6 26H26C27.1046 26 28 25.1046 28 24V18Z"
  />
</svg>
