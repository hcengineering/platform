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
  import type { IconSize } from '@hcengineering/ui'
  export let size: IconSize = 'small'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path
    d="M7 11.0004C7 10.4481 7.44772 10.0004 8 10.0004H24C24.5523 10.0004 25 10.4481 25 11.0004C25 11.5527 24.5523 12.0004 24 12.0004H8C7.44772 12.0004 7 11.5527 7 11.0004Z"
  />
  <path
    d="M7 16.0004C7 15.4481 7.44772 15.0004 8 15.0004H20C20.5523 15.0004 21 15.4481 21 16.0004C21 16.5527 20.5523 17.0004 20 17.0004H8C7.44772 17.0004 7 16.5527 7 16.0004Z"
  />
  <path
    d="M8 20.0004C7.44772 20.0004 7 20.4481 7 21.0004C7 21.5527 7.44772 22.0004 8 22.0004H23C23.5523 22.0004 24 21.5527 24 21.0004C24 20.4481 23.5523 20.0004 23 20.0004H8Z"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M2 8.00012C2 5.79098 3.79086 4.00012 6 4.00012H26C28.2091 4.00012 30 5.79098 30 8.00012V24.0001C30 26.2093 28.2091 28.0001 26 28.0001H6C3.79086 28.0001 2 26.2093 2 24.0001V8.00012ZM6 6.00012H26C27.1046 6.00012 28 6.89555 28 8.00012V24.0001C28 25.1047 27.1046 26.0001 26 26.0001H6C4.89543 26.0001 4 25.1047 4 24.0001V8.00012C4 6.89555 4.89543 6.00012 6 6.00012Z"
  />
</svg>
