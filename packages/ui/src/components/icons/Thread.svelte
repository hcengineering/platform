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

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M16 6C9.20948 6 4 10.6272 4 16C4 18.1619 4.82539 20.1782 6.25857 21.8353C6.48585 22.0981 6.56044 22.46 6.45559 22.7913C6.11025 23.8822 5.59859 24.9049 4.96437 25.8562C6.36749 25.6496 7.72455 25.2236 8.98685 24.5982C9.26684 24.4595 9.59558 24.4596 9.87546 24.5986C11.6632 25.4861 13.7558 26 16 26C22.7905 26 28 21.3728 28 16C28 10.6272 22.7905 6 16 6ZM2 16C2 9.2225 8.43112 4 16 4C23.5689 4 30 9.2225 30 16C30 22.7775 23.5689 28 16 28C13.6319 28 11.3944 27.4963 9.43078 26.6016C7.4311 27.5144 5.24057 28 3 28C2.63121 28 2.29235 27.797 2.11833 27.4719C1.94431 27.1467 1.96338 26.7522 2.16795 26.4453L3.37487 24.6349C3.78033 24.0267 4.11535 23.3749 4.37375 22.692C2.88402 20.7925 2 18.4911 2 16Z"
  />
</svg>
