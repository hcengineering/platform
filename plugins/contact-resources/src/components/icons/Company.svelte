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

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 8H18V10H16V8Z" />
  <path d="M22 8H20V10H22V8Z" />
  <path d="M16 16H18V18H16V16Z" />
  <path d="M22 16H20V18H22V16Z" />
  <path d="M16 20H18V22H16V20Z" />
  <path d="M22 20H20V22H22V20Z" />
  <path d="M16 12H18V14H16V12Z" />
  <path d="M22 12H20V14H22V12Z" />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M14 4C12.8954 4 12 4.89543 12 6V13H8C6.89543 13 6 13.8954 6 15V27H5C4.44772 27 4 27.4477 4 28C4 28.5523 4.44772 29 5 29H27C27.5523 29 28 28.5523 28 28C28 27.4477 27.5523 27 27 27H26V6C26 4.89543 25.1046 4 24 4H14ZM8 15H12V18H10V20H12V22H10V24H12V27H8V15ZM14 27H18V24H20V27H24V6H14V27Z"
  />
</svg>
