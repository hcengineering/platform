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

<svg class="svg-{size}" xmlns="http://www.w3.org/2000/svg" width="17" height="16" viewBox="0 0 17 16" {fill}>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M14 7V6.5C14 5.67157 13.3284 5 12.5 5H8.16421C7.76639 5 7.38486 4.84197 7.10355 4.56066L5.68934 3.14645C5.59557 3.05268 5.46839 3 5.33579 3H3.5C2.67157 3 2 3.67157 2 4.5V10.5L2.58555 8.45056C2.83087 7.59196 3.61564 7 4.5086 7H14Z"
    fill-opacity="0.1"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M3.5 2C2.11929 2 1 3.11929 1 4.5V11.5C1 12.8807 2.11929 14 3.5 14H13.4914C14.3844 14 15.1691 13.408 15.4144 12.5494L16.2716 9.54944C16.5735 8.49282 15.9696 7.44018 15 7.10762V6.5C15 5.11929 13.8807 4 12.5 4H8.16421C8.0316 4 7.90443 3.94732 7.81066 3.85355L6.39645 2.43934C6.11514 2.15804 5.73361 2 5.33579 2H3.5ZM14 7V6.5C14 5.67157 13.3284 5 12.5 5H8.16421C7.76639 5 7.38486 4.84197 7.10355 4.56066L5.68934 3.14645C5.59557 3.05268 5.46839 3 5.33579 3H3.5C2.67157 3 2 3.67157 2 4.5V10.5L2.58555 8.45056C2.83087 7.59196 3.61564 7 4.5086 7H14Z"
    fill-opacity="0.6"
  />
</svg>
