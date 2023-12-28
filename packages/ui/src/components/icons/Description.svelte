<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { IconSize } from '../../types'
  export let size: IconSize
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path
    d="M2 4.5C2 4.22386 2.22386 4 2.5 4H13.5C13.7761 4 14 4.22386 14 4.5C14 4.77614 13.7761 5 13.5 5H2.5C2.22386 5 2 4.77614 2 4.5Z"
  />
  <path
    d="M2 8C2 7.72386 2.22386 7.5 2.5 7.5H9.5C9.77614 7.5 10 7.72386 10 8C10 8.27614 9.77614 8.5 9.5 8.5H2.5C2.22386 8.5 2 8.27614 2 8Z"
  />
  <path
    d="M2 11.5C2 11.2239 2.22386 11 2.5 11H11.5C11.7761 11 12 11.2239 12 11.5C12 11.7761 11.7761 12 11.5 12H2.5C2.22386 12 2 11.7761 2 11.5Z"
  />
</svg>
