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
    d="M16 2C8.2 2 2 8.2 2 16C2 23.8 8.2 30 16 30C23.8 30 30 23.8 30 16C30 8.2 23.8 2 16 2ZM16 28C9.4 28 4 22.6 4 16C4 9.4 9.4 4 16 4C22.6 4 28 9.4 28 16C28 22.6 22.6 28 16 28Z"
  />
  <path
    d="M9.29289 9.29314C8.90237 9.68366 8.90237 10.3168 9.29289 10.7074L14.5858 16.0002L9.29289 21.2931C8.90237 21.6837 8.90237 22.3168 9.29289 22.7074C9.68342 23.0979 10.3166 23.0979 10.7071 22.7074L16 17.4145L21.2929 22.7074C21.6834 23.0979 22.3166 23.0979 22.7071 22.7074C23.0976 22.3168 23.0976 21.6837 22.7071 21.2931L17.4142 16.0002L22.7071 10.7074C23.0976 10.3168 23.0976 9.68366 22.7071 9.29314C22.3166 8.90261 21.6834 8.90261 21.2929 9.29314L16 14.586L10.7071 9.29314C10.3166 8.90261 9.68342 8.90261 9.29289 9.29314Z"
  />
</svg>
