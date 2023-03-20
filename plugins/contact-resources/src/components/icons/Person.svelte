<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M8 4C6.89545 4 6 4.89545 6 6V6.5C6 7.60455 6.89545 8.5 8 8.5C9.10455 8.5 10 7.60455 10 6.5V6C10 4.89545 9.10455 4 8 4Z"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M8 15C11.866 15 15 11.866 15 8C15 4.13403 11.866 1 8 1C4.13403 1 1 4.13403 1 8C1 11.866 4.13403 15 8 15ZM5.12134 10.8787L4.1109 11.8891C3.1156 10.8938 2.5 9.5188 2.5 8C2.5 4.96246 4.96246 2.5 8 2.5C11.0375 2.5 13.5 4.96246 13.5 8C13.5 9.5188 12.8844 10.8938 11.8891 11.8891L10.8787 10.8787C10.316 10.3161 9.55298 10 8.75739 10H7.24261C6.44702 10 5.68396 10.316 5.12134 10.8787Z"
  />
</svg>
