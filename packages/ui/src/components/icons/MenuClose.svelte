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
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M5 5C4.44772 5 4 5.44772 4 6C4 6.55228 4.44772 7 5 7H27C27.5523 7 28 6.55228 28 6C28 5.44772 27.5523 5 27 5H5ZM5 15C4.44772 15 4 15.4477 4 16C4 16.5523 4.44772 17 5 17H15C15.5523 17 16 16.5523 16 16C16 15.4477 15.5523 15 15 15H5ZM19 16L24.3 10.7C24.6866 10.3134 25.3134 10.3134 25.7 10.7C26.0866 11.0866 26.0866 11.7134 25.7 12.1L21.8 16L25.7 19.9C26.0866 20.2866 26.0866 20.9134 25.7 21.3C25.3134 21.6866 24.6866 21.6866 24.3 21.3L19 16ZM4 26C4 25.4477 4.44772 25 5 25H27C27.5523 25 28 25.4477 28 26C28 26.5523 27.5523 27 27 27H5C4.44772 27 4 26.5523 4 26Z"
  />
</svg>
