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
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<div class="flex-grow">
  <svg class="svg-{size}" {fill} viewBox="0 0 174 33" width="174" height="33" xmlns="http://www.w3.org/2000/svg">
    <g fill="none">
      <path
        d="M106.8 32.4h18.7v-4.1h-12.4c1.7-6.8 12.1-8.3 12.1-15.9 0-4.1-2.8-7.1-8.6-7.1-3.7 0-6.8 1.1-9 2.2l1.3 3.8c2-.9 4.2-1.8 6.9-1.8 2.2 0 4.2.9 4.2 3.4.1 5.6-12.1 6-13.2 19.5zm56.1-5.7c-5.7 0-10.4-4.7-10.4-10.4s4.7-10.4 10.4-10.4 10.4 4.7 10.4 10.4-4.7 10.4-10.4 10.4zm0-18.9c-4.7 0-8.5 3.8-8.5 8.5s3.8 8.5 8.5 8.5 8.5-3.8 8.5-8.5-3.8-8.5-8.5-8.5z"
        fill="#00629A"
      />
      <path d="M168.8 16.3h-5.2v-5.2h-1.4v6.6h6.6v-1.4z" fill="#00629A" /><path
        d="M0 1.6h9c6.6 0 9.6 3.8 9.6 7.8 0 2.7-1.3 5.1-3.7 6.4v.1c3.6.9 5.8 3.8 5.8 7.4 0 4.8-3.6 9.1-10.8 9.1H0V1.6zm8.3 12.9c3.1 0 4.8-1.7 4.8-4.1 0-2.3-1.5-4.1-4.8-4.1H5.7v8.2h2.6zm.9 13.3c3.7 0 5.8-1.4 5.8-4.5 0-2.6-2-4.2-5.1-4.2H5.7v8.7h3.5zM24.9 3.4c0-1.9 1.5-3.4 3.4-3.4s3.5 1.4 3.5 3.4c0 1.8-1.5 3.3-3.5 3.3s-3.4-1.4-3.4-3.3zm.6 6.9h5.6v22.1h-5.6V10.3zM38.6 27V14.7h-4v-4.4h4V5.2l5.6-1.6v6.7h6.7l-1.4 4.4h-5.3v10.9c0 2.1.7 2.8 2.2 2.8 1.3 0 2.5-.5 3.4-1.1l1.7 3.8c-1.6 1.1-4.3 1.7-6.5 1.7-4 .1-6.4-2.1-6.4-5.8zm15.9-16.7h4.7l.6 2.5c2-2 3.8-3 6.1-3 1 0 2.2.3 3.1.9l-2 4.7c-1-.6-1.9-.7-2.5-.7-1.5 0-2.7.6-4.5 2.2v15.6h-5.6V10.3h.1zm16.7-6.9c0-1.9 1.5-3.4 3.4-3.4S78 1.5 78 3.4c0 1.8-1.5 3.3-3.5 3.3s-3.3-1.4-3.3-3.3zm.6 6.9h5.6v22.1h-5.6V10.3zm16.9 11-8-11h5.8l5.2 7.2 5.3-7.2h5.8l-8.1 11 8.2 11.1h-5.8L91.8 25l-5.4 7.4h-5.8l8.1-11.1z"
        fill="#3FC0F0"
      />
      <path
        d="M142.9 21.9V5.3h-3.5l-13.3 17.3v3.3h12v6.6h4.8v-6.6h4v-4h-4zm-4.8-3.9v3.8h-3.2c-1 0-2.8.1-3.4.1l6.8-9.2c0 .8-.2 3.2-.2 5.3z"
        fill="#00629A"
      /></g
    >
  </svg>
</div>
