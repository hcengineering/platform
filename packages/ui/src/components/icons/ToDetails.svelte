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
  export let size: 'x-small' | 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M10.6,17.3H3.3c-.3,0-.7-.1-.9-.4-.2-.2-.4-.6-.4-.9s.1-.7.4-.9c.2-.2.6-.4.9-.4h7.3l-1.4-1.4c-.2-.2-.4-.6-.4-.9,0-.3.1-.7.4-.9.2-.2.6-.4.9-.4.3,0,.7.1.9.4l3.7,3.7c.1.1.2.3.3.4,0,.2,0,.3,0,.5s0,.3,0,.5c0,.2-.2.3-.3.4l-3.7,3.7c-.2.2-.6.4-.9.4-.3,0-.7-.1-.9-.4-.2-.2-.4-.6-.4-.9,0-.3.1-.7.3-.9l1.4-1.5Z"
  />
  <path
    d="M26,4H6c-2.2,0-4,1.8-4,4v4c0,.6.4,1,1,1s1-.4,1-1v-4c0-1.1.9-2,2-2h14v20H6c-1.1,0-2-.9-2-2v-4c0-.6-.4-1-1-1s-1,.4-1,1v4c0,2.2,1.8,4,4,4h20c2.2,0,4-1.8,4-4V8c0-2.2-1.8-4-4-4Z"
  />
</svg>
