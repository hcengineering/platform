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

<svg class="svg-{size}" {fill} fill-opacity="0.0" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M4 10V3.83337C4 3.59767 4 3.47982 4.07322 3.4066C4.14645 3.33337 4.2643 3.33337 4.5 3.33337H10.7929C11.3066 3.33337 11.5635 3.33337 11.6274 3.4877C11.6913 3.64203 11.5097 3.82366 11.1464 4.18693L8.94951 6.38386C8.81618 6.5172 8.74951 6.58386 8.74951 6.66671C8.74951 6.74955 8.81618 6.81622 8.94951 6.94955L11.1464 9.14649C11.5097 9.50975 11.6913 9.69138 11.6274 9.84571C11.5635 10 11.3066 10 10.7929 10H4ZM4 10V12.6667"
    stroke="white"
    stroke-linecap="round"
  />
</svg>
