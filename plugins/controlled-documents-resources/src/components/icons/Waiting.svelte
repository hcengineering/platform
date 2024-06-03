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
    d="M10.9375 14.6875C10.9375 15.2053 10.5178 15.625 10 15.625C9.48224 15.625 9.0625 15.2053 9.0625 14.6875C9.0625 14.1697 9.48224 13.75 10 13.75C10.5178 13.75 10.9375 14.1697 10.9375 14.6875Z"
    fill-opacity="0.4"
  />
  <path
    d="M8.125 8.125C8.125 7.08947 8.96447 6.25 10 6.25C11.0355 6.25 11.875 7.08947 11.875 8.125V8.18524C11.875 9.1875 11.0625 10 10.0602 10C9.68179 10 9.375 10.3068 9.375 10.6852V11.875C9.375 12.2202 9.65482 12.5 10 12.5C10.3452 12.5 10.625 12.2202 10.625 11.875V11.1981C12.0478 10.933 13.125 9.68493 13.125 8.18524V8.125C13.125 6.39911 11.7259 5 10 5C8.27411 5 6.875 6.39911 6.875 8.125C6.875 8.47018 7.15482 8.75 7.5 8.75C7.84518 8.75 8.125 8.47018 8.125 8.125Z"
    fill-opacity="0.4"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M5.13876 2.72464C6.57769 1.76318 8.26942 1.25 10 1.25C12.3206 1.25 14.5462 2.17187 16.1872 3.81282C17.8281 5.45376 18.75 7.67936 18.75 10C18.75 11.7306 18.2368 13.4223 17.2754 14.8612C16.3139 16.3002 14.9473 17.4217 13.3485 18.0839C11.7496 18.7462 9.9903 18.9195 8.29296 18.5819C6.59563 18.2442 5.03653 17.4109 3.81282 16.1872C2.58911 14.9635 1.75575 13.4044 1.41813 11.707C1.08051 10.0097 1.25379 8.25037 1.91606 6.65152C2.57832 5.05267 3.69983 3.6861 5.13876 2.72464ZM5.83323 16.236C7.0666 17.0601 8.51664 17.5 10 17.5C11.9891 17.5 13.8968 16.7098 15.3033 15.3033C16.7098 13.8968 17.5 11.9891 17.5 10C17.5 8.51664 17.0601 7.06659 16.236 5.83322C15.4119 4.59985 14.2406 3.63856 12.8701 3.0709C11.4997 2.50325 9.99168 2.35472 8.53683 2.64411C7.08197 2.9335 5.7456 3.64781 4.6967 4.6967C3.64781 5.74559 2.9335 7.08197 2.64411 8.53682C2.35473 9.99168 2.50325 11.4997 3.07091 12.8701C3.63856 14.2406 4.59986 15.4119 5.83323 16.236Z"
    fill-opacity="0.4"
  />
</svg>
