<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M27 18C26.4477 18 26.0052 18.4488 25.9501 18.9984C25.787 20.6234 25.2277 22.1893 24.3147 23.5557C23.2159 25.2002 21.6541 26.4819 19.8268 27.2388C17.9996 27.9957 15.9889 28.1937 14.0491 27.8079C12.1093 27.422 10.3275 26.4696 8.92894 25.0711C7.53041 23.6725 6.578 21.8907 6.19215 19.9509C5.8063 18.0111 6.00433 16.0004 6.76121 14.1732C7.51809 12.3459 8.79981 10.7841 10.4443 9.6853C12.0888 8.58649 14.0222 8 16 8H22.1821L18.5977 11.5854L20 13L26 7L20 1L18.5977 2.414L22.1851 6H16C13.6266 6 11.3066 6.70379 9.33316 8.02236C7.35977 9.34094 5.8217 11.2151 4.91345 13.4078C4.0052 15.6005 3.76756 18.0133 4.23058 20.3411C4.6936 22.6689 5.83649 24.8071 7.51472 26.4853C9.19295 28.1635 11.3312 29.3064 13.6589 29.7694C15.9867 30.2324 18.3995 29.9948 20.5922 29.0866C22.7849 28.1783 24.6591 26.6402 25.9776 24.6668C27.1105 22.9714 27.7895 21.0201 27.9584 18.9989C28.0043 18.4485 27.5523 18 27 18Z"
  />
</svg>
