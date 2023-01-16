<!--
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
-->
<script lang="ts">
  export let size: 'x-small' | 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <g>
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M22,10.2h-3.2V3c0-0.4-0.3-0.8-0.8-0.8H2C1.6,2.2,1.2,2.6,1.2,3v12c0,0.4,0.3,0.8,0.8,0.8h2.2L6,17.5c0.3,0.3,0.8,0.3,1.1,0l1.8-1.8h1.4V19c0,0.4,0.3,0.8,0.8,0.8h5.2l1.3,1.3c0.3,0.3,0.8,0.3,1.1,0l1.3-1.3H22c0.4,0,0.8-0.3,0.8-0.8v-8C22.8,10.6,22.4,10.2,22,10.2z M8.5,14.2c-0.2,0-0.4,0.1-0.5,0.2l-1.5,1.5L5,14.5c-0.1-0.1-0.3-0.2-0.5-0.2H2.8V3.8h14.5V11v3.2H11H8.5z M21.2,18.2h-1.8c-0.2,0-0.4,0.1-0.5,0.2l-1,1l-1-1c-0.1-0.1-0.3-0.2-0.5-0.2h-4.8v-2.5H18c0.4,0,0.8-0.3,0.8-0.8v-3.2h2.5V18.2z"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M9,10.2H6c-0.4,0-0.8,0.3-0.8,0.8s0.3,0.8,0.8,0.8h3c0.4,0,0.8-0.3,0.8-0.8S9.4,10.2,9,10.2z"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M6,7.8h6c0.4,0,0.8-0.3,0.8-0.8S12.4,6.2,12,6.2H6C5.6,6.2,5.2,6.6,5.2,7S5.6,7.8,6,7.8z"
    />
  </g>
</svg>
