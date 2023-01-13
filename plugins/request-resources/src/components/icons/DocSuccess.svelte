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
      d="M19,1.2H5C4,1.2,3.2,2,3.2,3v18c0,1,0.8,1.8,1.8,1.8h14c1,0,1.8-0.8,1.8-1.8V3C20.8,2,20,1.2,19,1.2z M19.2,21c0,0.1-0.1,0.2-0.2,0.2H5c-0.1,0-0.2-0.1-0.2-0.2V3c0-0.1,0.1-0.2,0.2-0.2h14c0.1,0,0.2,0.1,0.2,0.2V21z"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M15.5,14.2h-7c-0.4,0-0.8,0.3-0.8,0.8s0.3,0.8,0.8,0.8h7c0.4,0,0.8-0.3,0.8-0.8S15.9,14.2,15.5,14.2z"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M12,17.2H8.5c-0.4,0-0.8,0.3-0.8,0.8s0.3,0.8,0.8,0.8H12c0.4,0,0.8-0.3,0.8-0.8S12.4,17.2,12,17.2z"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M10.5,11c0.3,0.3,0.8,0.3,1.1,0l4-4c0.3-0.3,0.3-0.8,0-1.1c-0.3-0.3-0.8-0.3-1.1,0L11,9.4L9.5,8C9.2,7.7,8.8,7.7,8.5,8S8.2,8.7,8.5,9L10.5,11z"
    />
  </g>
</svg>
