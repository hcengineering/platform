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
  export let size: 'x-small' | 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M 4.25 2 C 2.45508 2 1 3.45508 1 5.25 V 10.7499 C 1 12.5449 2.45508 13.9999 4.25 13.9999 H 11.75 C 13.5449 13.9999 15 12.5449 15 10.7499 V 5.25 C 15 3.45508 13.5449 2 11.75 2 H 4.25 Z M 2.5 10.4999 C 2.5 11.6045 3.39543 12.4999 4.5 12.4999 H 11.75 C 12.7165 12.4999 13.5 11.7164 13.5 10.7499 V 5.25 C 13.5 4.28351 12.7165 3.5 11.75 3.5 H 4.5 C 3.39543 3.5 2.5 4.39543 2.5 5.5 V 10.4999 Z"
  />
  <rect x="9" y="3" width="1.5" height="10" />
</svg>
