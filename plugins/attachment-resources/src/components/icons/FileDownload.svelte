<!--
// Copyright © 2022 Hardcore Engineering Inc.
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

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path
    d="M11.2 0H5.8c-.1 0-.3.1-.4.2L1.3 4.5c-.1.1-.1.2-.1.3v7.5c0 2 1.5 3.6 3.5 3.7h6.6c2 0 3.6-1.7 3.5-3.7V3.5c0-1.9-1.6-3.5-3.6-3.5zM5.5 1.4V3c0 1-.7 1.8-1.6 1.8H2.2l3.3-3.4zm8.4 11c0 1.5-1.1 2.7-2.7 2.7H4.7c-1.5-.1-2.6-1.2-2.6-2.7V5.8h1.8c1.4 0 2.6-1.2 2.6-2.8V1h4.8c1.4 0 2.6 1.2 2.7 2.6v8.8h-.1z"
  />
  <path
    d="M7.7 11.9s.1.1.2.1H8.2c.1 0 .1-.1.2-.1l2-2.1c.2-.2.2-.5 0-.7-.2-.2-.5-.2-.7 0l-1.3 1.3V6.2c.1-.3-.1-.5-.4-.5-.3 0-.5.2-.5.5v4.2L6.2 9.1C6.1 9 6 9 5.9 9s-.2 0-.3.1c-.2.2-.2.5 0 .7l2.1 2.1z"
  />
</svg>
