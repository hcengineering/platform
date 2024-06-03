<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { FlamingoColor } from '@hcengineering/ui'

  export let size: 'small' | 'medium' | 'large'
  const fill: string = FlamingoColor
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <g>
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75ZM1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12Z"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M12 6.25C12.4142 6.25 12.75 6.58579 12.75 7V14.1047C12.75 14.5189 12.4142 14.8547 12 14.8547C11.5858 14.8547 11.25 14.5189 11.25 14.1047V7C11.25 6.58579 11.5858 6.25 12 6.25Z"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M11 17C11 16.4477 11.4477 16 12 16H12.01C12.5623 16 13.01 16.4477 13.01 17C13.01 17.5523 12.5623 18 12.01 18H12C11.4477 18 11 17.5523 11 17Z"
    />
  </g>
</svg>
