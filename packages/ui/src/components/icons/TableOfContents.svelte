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
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M26 11.0005C26 10.4482 25.5523 10.0005 25 10.0005H20C19.4477 10.0005 19 10.4482 19 11.0005C19 11.5528 19.4477 12.0005 20 12.0005H25C25.5523 12.0005 26 11.5528 26 11.0005Z"
  />
  <path
    d="M26 16.0005C26 15.4482 25.5523 15.0005 25 15.0005H20C19.4477 15.0005 19 15.4482 19 16.0005C19 16.5528 19.4477 17.0005 20 17.0005H25C25.5523 17.0005 26 16.5528 26 16.0005Z"
  />
  <path
    d="M19 21.0005C19 20.4482 19.4477 20.0005 20 20.0005H25C25.5523 20.0005 26 20.4482 26 21.0005C26 21.5528 25.5523 22.0005 25 22.0005H20C19.4477 22.0005 19 21.5528 19 21.0005Z"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M6 4.00012C3.79086 4.00012 2 5.79098 2 8.00012V24.0001C2 26.2093 3.79086 28.0001 6 28.0001H26C28.2091 28.0001 30 26.2093 30 24.0001V8.00012C30 5.79098 28.2091 4.00012 26 4.00012H6ZM15 6.00012H6C4.89543 6.00012 4 6.89555 4 8.00012V24.0001C4 25.1047 4.89543 26.0001 6 26.0001H15V6.00012ZM17 6.00012V26.0001H26C27.1046 26.0001 28 25.1047 28 24.0001V8.00012C28 6.89555 27.1046 6.00012 26 6.00012H17Z"
  />
</svg>
