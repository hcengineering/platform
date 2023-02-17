<!--
//
// Copyright © 2022 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M12.3,7.8H3.7c-0.8,0-1.5-0.7-1.5-1.5V3.7c0-0.8,0.7-1.5,1.5-1.5h8.7c0.8,0,1.5,0.7,1.5,1.5v2.7C13.8,7.2,13.2,7.8,12.3,7.8z M3.7,3.2c-0.3,0-0.5,0.2-0.5,0.5v2.7c0,0.3,0.2,0.5,0.5,0.5h8.7c0.3,0,0.5-0.2,0.5-0.5V3.7c0-0.3-0.2-0.5-0.5-0.5H3.7z"
  />
  <path
    d="M4.7,13.8c-1,0-1.6,0-2.1-0.4s-0.4-1-0.4-2.1s0-1.6,0.4-2.1s1-0.4,2.1-0.4h2.5v2.5c0,1,0,1.6-0.4,2.1S5.7,13.8,4.7,13.8z M4.7,9.8c-0.7,0-1.2,0-1.4,0.1s-0.1,0.6-0.1,1.4s0,1.2,0.1,1.4s0.6,0.1,1.4,0.1s1.2,0,1.4-0.1s0.1-0.6,0.1-1.4V9.8H4.7z"
  />
  <path
    d="M11.3,13.8c-1,0-1.6,0-2.1-0.4s-0.4-1-0.4-2.1V8.8h2.5c1,0,1.6,0,2.1,0.4s0.4,1,0.4,2.1s0,1.6-0.4,2.1S12.4,13.8,11.3,13.8z M9.8,9.8v1.5c0,0.7,0,1.2,0.1,1.4s0.6,0.1,1.4,0.1s1.2,0,1.4-0.1s0.1-0.6,0.1-1.4s0-1.2-0.1-1.4s-0.6-0.1-1.4-0.1H9.8z"
  />
</svg>
