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
    d="M4 10C4 6.68629 6.68629 4 10 4H22C25.3137 4 28 6.68629 28 10V22C28 25.3137 25.3137 28 22 28H10C6.68629 28 4 25.3137 4 22V10Z"
  />
</svg>
