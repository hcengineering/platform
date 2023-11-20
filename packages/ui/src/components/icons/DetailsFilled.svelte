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
    d="M2 8.00049C2 5.79135 3.79086 4.00049 6 4.00049H26C28.2091 4.00049 30 5.79135 30 8.00049V24.0005C30 26.2096 28.2091 28.0005 26 28.0005H6C3.79086 28.0005 2 26.2096 2 24.0005V8.00049ZM20 6.00049H6C4.89543 6.00049 4 6.89592 4 8.00049V24.0005C4 25.1051 4.89543 26.0005 6 26.0005H20V6.00049Z"
  />
</svg>
