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

<svg class="svg-{size}" {fill} viewBox="0 0 10 14" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M0 2C0 0.895431 0.89543 0 2 0H8C9.10457 0 10 0.89543 10 2V13.5C10 13.6844 9.89851 13.8538 9.73593 13.9408C9.57335 14.0278 9.37608 14.0183 9.22265 13.916L5 11.1009L0.77735 13.916C0.623922 14.0183 0.42665 14.0278 0.264071 13.9408C0.101492 13.8538 0 13.6844 0 13.5V2Z"
  />
</svg>
