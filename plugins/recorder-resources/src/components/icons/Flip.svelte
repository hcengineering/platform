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
  export let size: 'x-small' | 'small' | 'medium' | 'large' | 'full'
  export let fill: string = 'currentColor'
</script>

<svg width="32" height="32" viewBox="0 0 32 32" class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg">
  <path
    d="M17 29C17 29.5523 16.5523 30 16 30C15.4477 30 15 29.5523 15 29V23.9807C11.6703 23.8517 8.63508 23.0825 6.33943 21.8662C3.86041 20.5527 2 18.5666 2 16.1121C2 14.3994 2.91858 12.9036 4.29003 11.7304C5.66135 10.5573 7.55607 9.63747 9.73381 9.03609C10.2662 8.88908 10.8169 9.20146 10.9639 9.73382C11.1109 10.2662 10.7985 10.8169 10.2662 10.9639C8.28415 11.5113 6.67887 12.3188 5.59014 13.2502C4.50153 14.1814 4 15.1673 4 16.1121C4 17.4616 5.04974 18.9195 7.2758 20.0989C9.24478 21.1422 11.948 21.8509 15 21.9791L15 3C15 2.44771 15.4477 2 16 2C16.5523 2 17 2.44772 17 3L17 21.9791C20.052 21.8509 22.7552 21.1422 24.7242 20.0989C26.9503 18.9195 28 17.4616 28 16.1121C28 15.1673 27.4985 14.1814 26.4099 13.2502C25.5635 12.5261 24.405 11.877 23 11.3667V15H21V9.00001H29V11H26.7411C27.0872 11.231 27.411 11.4747 27.71 11.7304C29.0814 12.9036 30 14.3994 30 16.1121C30 18.5666 28.1396 20.5527 25.6606 21.8662C23.3649 23.0825 20.3297 23.8517 17 23.9807V29Z"
  />
</svg>
