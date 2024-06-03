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
  export let fill: string = 'currentColor'
  export let size: 'small' | 'medium' | 'large' = 'small'
</script>

<svg class="svg-{size}" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" {fill}>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M5.13876 2.72464C6.57769 1.76318 8.26942 1.25 10 1.25C12.3206 1.25 14.5462 2.17187 16.1872 3.81282C17.8281 5.45376 18.75 7.67936 18.75 10C18.75 11.7306 18.2368 13.4223 17.2754 14.8612C16.3139 16.3002 14.9473 17.4217 13.3485 18.0839C11.7496 18.7462 9.9903 18.9195 8.29296 18.5819C6.59563 18.2442 5.03653 17.4109 3.81282 16.1872C2.58911 14.9635 1.75575 13.4044 1.41813 11.707C1.08051 10.0097 1.25379 8.25037 1.91606 6.65152C2.57832 5.05267 3.69983 3.6861 5.13876 2.72464ZM14.1919 7.94209C14.436 7.69802 14.436 7.30229 14.1919 7.05821C13.9479 6.81413 13.5521 6.81413 13.3081 7.05821L8.75 11.6163L6.69194 9.55821C6.44786 9.31413 6.05214 9.31413 5.80806 9.55821C5.56398 9.80229 5.56398 10.198 5.80806 10.4421L8.30806 12.9421C8.55214 13.1862 8.94786 13.1862 9.19194 12.9421L14.1919 7.94209Z"
    fill="#38833F"
  />
</svg>
