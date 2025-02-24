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
  import type { IconSize } from '../../types'

  export let size: IconSize = 'small'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path
    d="M27 27a1 1 0 1 0 0-2H5a1 1 0 1 0 0 2zm0-10a1 1 0 1 0 0-2H17a1 1 0 1 0 0 2zm-14-1-5.3 5.3a.99.99 0 1 1-1.4-1.4l3.9-3.9-3.9-3.9a.99.99 0 1 1 1.4-1.4zM28 6a1 1 0 0 1-1 1H5a1 1 0 1 1 0-2h22a1 1 0 0 1 1 1"
  />
</svg>
