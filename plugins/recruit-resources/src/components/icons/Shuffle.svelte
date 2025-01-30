<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { IconSize } from '@hcengineering/ui'

  export let size: IconSize
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M21.9,16.6c-0.1-0.1-0.1-0.2-0.2-0.3l-3-3c-0.4-0.4-1-0.4-1.4,0s-0.4,1,0,1.4l1.3,1.3H16c-1.1,0-2.1-0.4-2.8-1.2C12.4,14.1,12,13.1,12,12s0.4-2.1,1.2-2.8C13.9,8.4,14.9,8,16,8h2.6l-1.3,1.3c-0.4,0.4-0.4,1,0,1.4c0.2,0.2,0.5,0.3,0.7,0.3s0.5-0.1,0.7-0.3l3-3c0.1-0.1,0.2-0.2,0.2-0.3c0.1-0.2,0.1-0.5,0-0.8c-0.1-0.1-0.1-0.2-0.2-0.3l-3-3c-0.4-0.4-1-0.4-1.4,0s-0.4,1,0,1.4L18.6,6H16c-1.6,0-3.1,0.6-4.2,1.8C11.5,8,11.2,8.4,11,8.7c-0.2-0.3-0.5-0.6-0.8-0.9C9.1,6.6,7.6,6,6,6H3C2.4,6,2,6.4,2,7s0.4,1,1,1h3c1.1,0,2.1,0.4,2.8,1.2C9.6,9.9,10,10.9,10,12s-0.4,2.1-1.2,2.8C8.1,15.6,7.1,16,6,16H3c-0.6,0-1,0.4-1,1s0.4,1,1,1h3c1.6,0,3.1-0.6,4.2-1.8c0.3-0.3,0.5-0.6,0.8-0.9c0.2,0.3,0.5,0.6,0.8,0.9c1.1,1.1,2.6,1.8,4.2,1.8h2.6l-1.3,1.3c-0.4,0.4-0.4,1,0,1.4c0.2,0.2,0.5,0.3,0.7,0.3s0.5-0.1,0.7-0.3l3-3c0.1-0.1,0.2-0.2,0.2-0.3C22,17.1,22,16.9,21.9,16.6z"
  />
</svg>
