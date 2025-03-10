<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  export let size: 'x-small' | 'small' | 'medium' | 'large' | 'full'
  export let fill: string = 'currentColor'
</script>

<svg width="32" height="32" viewBox="0 0 32 32" class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg">
  <path
    d="M8 6C8 4.89543 8.89543 4 10 4C11.1046 4 12 4.89543 12 6V26C12 27.1046 11.1046 28 10 28C8.89543 28 8 27.1046 8 26V6Z"
  />
  <path
    d="M20 6C20 4.89543 20.8954 4 22 4C23.1046 4 24 4.89543 24 6V26C24 27.1046 23.1046 28 22 28C20.8954 28 20 27.1046 20 26V6Z"
  />
</svg>
