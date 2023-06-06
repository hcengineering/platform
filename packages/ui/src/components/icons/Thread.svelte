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
  import { ButtonSize } from '../../types'

  export let size: ButtonSize
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M8,14.5c-0.9,0-1.9-0.2-2.7-0.6c-0.2-0.1-0.5-0.2-0.6-0.2c-0.2,0-0.4,0.1-0.7,0.2c-0.5,0.2-1.2,0.4-1.7-0.1 c-0.5-0.5-0.3-1.2-0.1-1.7c0.1-0.3,0.2-0.5,0.2-0.7c0-0.2-0.1-0.4-0.2-0.7C1,8.3,1.5,5.3,3.4,3.4C4.6,2.2,6.3,1.5,8,1.5 s3.4,0.7,4.6,1.9c2.5,2.5,2.5,6.7,0,9.2l0,0C11.4,13.8,9.7,14.5,8,14.5z M4.6,12.7c0.4,0,0.7,0.1,1,0.3c2.1,1,4.6,0.5,6.2-1.1 c2.1-2.1,2.1-5.6,0-7.8c-1-1-2.4-1.6-3.9-1.6c-1.5,0-2.9,0.6-3.9,1.6C2.5,5.7,2,8.2,3,10.3c0.1,0.4,0.3,0.7,0.3,1.1 c0,0.4-0.1,0.7-0.2,1C3,12.6,2.9,13,2.9,13.1C3,13.2,3.4,13,3.6,12.9C3.9,12.8,4.3,12.7,4.6,12.7z M12.2,12.2L12.2,12.2L12.2,12.2z"
  />
</svg>
