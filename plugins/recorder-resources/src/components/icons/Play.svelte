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
    d="M27 14.2677C28.3333 15.0375 28.3333 16.962 27 17.7318L9 28.1241C7.66666 28.8939 6 27.9317 6 26.3921L6 5.60747C6 4.06787 7.66667 3.10563 9 3.87543L27 14.2677Z"
  />
</svg>
