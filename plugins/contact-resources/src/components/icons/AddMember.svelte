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

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 14">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M5 8C7.20914 8 9 6.20914 9 4C9 1.79086 7.20914 0 5 0C2.79086 0 1 1.79086 1 4C1 6.20914 2.79086 8 5 8ZM5 7C6.65685 7 8 5.65685 8 4C8 2.34315 6.65685 1 5 1C3.34315 1 2 2.34315 2 4C2 5.65685 3.34315 7 5 7Z"
  />
  <path
    d="M9 9.5C9 9.22386 9.22386 9 9.5 9C9.77614 9 10 9.22386 10 9.5V11H11.5C11.7761 11 12 11.2239 12 11.5C12 11.7761 11.7761 12 11.5 12H10V13.5C10 13.7761 9.77614 14 9.5 14C9.22386 14 9 13.7761 9 13.5V12H7.5C7.22386 12 7 11.7761 7 11.5C7 11.2239 7.22386 11 7.5 11H9V9.5Z"
  />
  <path
    d="M3.5 9C1.567 9 0 10.567 0 12.5V13.5C0 13.7761 0.223858 14 0.5 14C0.776142 14 1 13.7761 1 13.5V12.5C1 11.1193 2.11929 10 3.5 10H5.5C5.77614 10 6 9.77614 6 9.5C6 9.22386 5.77614 9 5.5 9H3.5Z"
  />
</svg>
