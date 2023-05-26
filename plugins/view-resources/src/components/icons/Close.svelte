<!--
//
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
//
-->
<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  export let descending: boolean = false
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M8.7,8l4.6-4.6c0.2-0.2,0.2-0.5,0-0.7s-0.5-0.2-0.7,0L8,7.3L3.4,2.6c-0.2-0.2-0.5-0.2-0.7,0s-0.2,0.5,0,0.7L7.3,8l-4.6,4.6c-0.2,0.2-0.2,0.5,0,0.7c0.1,0.1,0.2,0.1,0.4,0.1s0.3,0,0.4-0.1L8,8.7l4.6,4.6c0.1,0.1,0.2,0.1,0.4,0.1s0.3,0,0.4-0.1c0.2-0.2,0.2-0.5,0-0.7L8.7,8z"
  />
</svg>
