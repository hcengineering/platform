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
  <path d="M17 26L27 16L17 6L15.5858 7.41421L24.1716 16L15.5858 24.5858L17 26Z" />
  <path d="M6 26L16 16L6 6L4.58579 7.41421L13.1716 16L4.58579 24.5858L6 26Z" />
</svg>
