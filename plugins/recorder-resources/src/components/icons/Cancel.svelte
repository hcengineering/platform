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
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M11.0251 3.98957C13.669 2.89443 16.6004 2.70229 19.3646 3.44297C22.1289 4.18364 24.5715 5.81573 26.3136 8.08611C28.0557 10.3565 29 13.1383 29 16C29 18.8617 28.0557 21.6435 26.3136 23.9139C24.5715 26.1843 22.1289 27.8164 19.3646 28.557C16.6004 29.2977 13.669 29.1056 11.0251 28.0104C8.38121 26.9153 6.17254 24.9783 4.74167 22.5C4.46553 22.0217 4.6294 21.4101 5.1077 21.134C5.58599 20.8578 6.19758 21.0217 6.47372 21.5C7.68446 23.5971 9.55333 25.236 11.7905 26.1627C14.0276 27.0893 16.508 27.2519 18.847 26.6252C21.186 25.9985 23.2528 24.6175 24.7269 22.6964C26.201 20.7753 27 18.4215 27 16C27 13.5785 26.201 11.2247 24.7269 9.30363C23.2528 7.38254 21.186 6.00154 18.847 5.37482C16.508 4.7481 14.0276 4.91067 11.7905 5.83733C9.73438 6.689 7.98936 8.14233 6.78045 10H12V12H4V4H6V7.69335C7.34238 6.07734 9.06402 4.80188 11.0251 3.98957Z"
  />
</svg>
