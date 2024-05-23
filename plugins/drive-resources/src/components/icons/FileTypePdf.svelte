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
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M9 4C7.89543 4 7 4.89543 7 6V26C7 27.1046 7.89543 28 9 28H23C24.1046 28 25 27.1046 25 26V12H21C18.7909 12 17 10.2091 17 8V4H9ZM19 4.41421V8C19 9.10457 19.8954 10 21 10H24.5858L19 4.41421ZM5 6C5 3.79086 6.79086 2 9 2H18.5858C19.1162 2 19.6249 2.21071 20 2.58579L26.4142 9C26.7893 9.37507 27 9.88378 27 10.4142V26C27 28.2091 25.2091 30 23 30H9C6.79086 30 5 28.2091 5 26V6ZM10 17C10 16.4477 10.4477 16 11 16H21C21.5523 16 22 16.4477 22 17C22 17.5523 21.5523 18 21 18H11C10.4477 18 10 17.5523 10 17ZM10 23C10 22.4477 10.4477 22 11 22H21C21.5523 22 22 22.4477 22 23C22 23.5523 21.5523 24 21 24H11C10.4477 24 10 23.5523 10 23Z"
  />
</svg>
