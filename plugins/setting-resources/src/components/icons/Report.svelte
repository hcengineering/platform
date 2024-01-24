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
    d="M10 14.0005C9.44772 14.0005 9 14.4482 9 15.0005C9 15.5528 9.44772 16.0005 10 16.0005H22C22.5523 16.0005 23 15.5528 23 15.0005C23 14.4482 22.5523 14.0005 22 14.0005H10Z"
  />
  <path
    d="M9 19.0005C9 18.4482 9.44772 18.0005 10 18.0005H18C18.5523 18.0005 19 18.4482 19 19.0005C19 19.5528 18.5523 20.0005 18 20.0005H10C9.44772 20.0005 9 19.5528 9 19.0005Z"
  />
  <path
    d="M10 22.0005C9.44772 22.0005 9 22.4482 9 23.0005C9 23.5528 9.44772 24.0005 10 24.0005H16C16.5523 24.0005 17 23.5528 17 23.0005C17 22.4482 16.5523 22.0005 16 22.0005H10Z"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M19 2.00049C20.3062 2.00049 21.4175 2.8353 21.8293 4.00049H23C25.2091 4.00049 27 5.79135 27 8.00049V26.0005C27 28.2096 25.2091 30.0005 23 30.0005H9C6.79086 30.0005 5 28.2096 5 26.0005V8.00049C5 5.79135 6.79086 4.00049 9 4.00049H10.1707C10.5825 2.8353 11.6938 2.00049 13 2.00049H19ZM12 5.00049C12 4.4482 12.4477 4.00049 13 4.00049H19C19.5523 4.00049 20 4.4482 20 5.00049C20 5.55277 19.5523 6.00049 19 6.00049H13C12.4477 6.00049 12 5.55277 12 5.00049ZM19 8.00049C20.3062 8.00049 21.4175 7.16568 21.8293 6.00049H23C24.1046 6.00049 25 6.89592 25 8.00049V26.0005C25 27.1051 24.1046 28.0005 23 28.0005H9C7.89543 28.0005 7 27.1051 7 26.0005V8.00049C7 6.89592 7.89543 6.00049 9 6.00049H10.1707C10.5825 7.16568 11.6938 8.00049 13 8.00049H19Z"
  />
</svg>
