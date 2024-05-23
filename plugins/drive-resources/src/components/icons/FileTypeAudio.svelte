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
  export let fill: string = 'currentColor'
  export let size: 'small' | 'medium' | 'large' = 'small'
</script>

<svg class="svg-{size}" {fill} width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path d="M13 15V23L20 19L13 15Z" />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M9 4C7.89543 4 7 4.89543 7 6V26C7 27.1046 7.89543 28 9 28H23C24.1046 28 25 27.1046 25 26V12H21C18.7909 12 17 10.2091 17 8V4H9ZM19 4.41421V8C19 9.10457 19.8954 10 21 10H24.5858L19 4.41421ZM5 6C5 3.79086 6.79086 2 9 2H18.5858C19.1162 2 19.6249 2.21071 20 2.58579L26.4142 9C26.7893 9.37507 27 9.88378 27 10.4142V26C27 28.2091 25.2091 30 23 30H9C6.79086 30 5 28.2091 5 26V6Z"
  />
</svg>
