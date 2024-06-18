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
  export let fill: string = 'currentColor'
  export let size: 'small' | 'medium' | 'large' = 'small'
</script>

<svg class="svg-{size}" {fill} width="32" height="32" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M426.666667 170.666667H170.666667c-47.36 0-85.333333 37.973333-85.333334 85.333333v512a85.333333 85.333333 0 0 0 85.333334 85.333333h682.666666a85.333333 85.333333 0 0 0 85.333334-85.333333V341.333333a85.333333 85.333333 0 0 0-85.333334-85.333333h-341.333333l-85.333333-85.333333z"
  />
</svg>
