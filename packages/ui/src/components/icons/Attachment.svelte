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
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M12.9142 2.58576C12.1378 1.80936 10.8893 1.8178 10.1035 2.60352L3.8535 8.85351C2.68656 10.0205 2.70242 11.9451 3.87865 13.1213C5.05488 14.2975 6.97945 14.3134 8.1464 13.1464L11.1463 10.1465C11.3416 9.95119 11.6582 9.95119 11.8535 10.1465C12.0487 10.3417 12.0487 10.6583 11.8535 10.8536L8.85351 13.8535C7.28679 15.4202 4.72899 15.3858 3.17154 13.8284C1.61411 12.271 1.57967 9.71313 3.1464 8.1464L9.39642 1.89642C10.5633 0.729518 12.4451 0.702443 13.6213 1.87866C14.7975 3.05488 14.7704 4.93673 13.6035 6.10362L7.35245 12.3547C6.59335 13.1138 5.36185 13.1928 4.58451 12.4154C3.80823 11.6392 3.88608 10.4103 4.64203 9.65096L8.01763 6.154C8.20942 5.95532 8.52595 5.94973 8.72463 6.14152C8.92331 6.3333 8.9289 6.64983 8.73711 6.84851L5.35557 10.3516L5.35245 10.3548C4.93991 10.7673 4.94735 11.3641 5.29161 11.7083C5.63594 12.0527 6.23287 12.0601 6.64534 11.6476L12.8964 5.39651C13.6821 4.61079 13.6906 3.36217 12.9142 2.58576Z"
  />
</svg>
