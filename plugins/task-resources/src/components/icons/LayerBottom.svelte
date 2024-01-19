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
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M17.4689 4.38414C16.5566 3.87228 15.4434 3.87228 14.5311 4.38415L2.51037 11.129C2.19514 11.3059 2 11.639 2 12.0002C2 12.3615 2.19514 12.6946 2.51037 12.8715L8.08647 16.0002L2.51037 19.129C2.19514 19.3059 2 19.639 2 20.0002C2 20.3615 2.19514 20.6946 2.51037 20.8715L14.5311 27.6163C15.4434 28.1282 16.5566 28.1282 17.4689 27.6163L29.4896 20.8715C29.8049 20.6946 30 20.3615 30 20.0002C30 19.639 29.8049 19.3059 29.4896 19.129L23.9135 16.0002L29.4896 12.8715C29.8049 12.6946 30 12.3615 30 12.0002C30 11.639 29.8049 11.3059 29.4896 11.129L17.4689 4.38414ZM15.5104 6.12665C15.8145 5.95602 16.1855 5.95602 16.4896 6.12664L26.9576 12.0002L16.4896 17.8738C16.1855 18.0445 15.8145 18.0445 15.5104 17.8738L5.04238 12.0002L15.5104 6.12665Z"
  />
</svg>
