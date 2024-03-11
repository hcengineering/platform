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
  export let size: 'tiny' | 'xx-small' | 'x-small' | 'small' | 'medium' | 'large' = 'small'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M6 6.00012C6 3.79098 7.79086 2.00012 10 2.00012H22C24.2091 2.00012 26 3.79098 26 6.00012V29.0001C26 29.3689 25.797 29.7078 25.4719 29.8818C25.1467 30.0558 24.7522 30.0367 24.4453 29.8322L16 24.202L7.5547 29.8322C7.24784 30.0367 6.8533 30.0558 6.52814 29.8818C6.20298 29.7078 6 29.3689 6 29.0001V6.00012Z"
  />
</svg>
