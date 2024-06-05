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

<svg class="svg-{size}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" {fill}>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M1 4.5C1 3.11929 2.11929 2 3.5 2H5.33579C5.73361 2 6.11514 2.15804 6.39645 2.43934L7.81066 3.85355C7.90443 3.94732 8.03161 4 8.16421 4H12.5C13.8807 4 15 5.11929 15 6.5V11.5C15 12.8807 13.8807 14 12.5 14H3.5C2.11929 14 1 12.8807 1 11.5V4.5ZM3.5 3C2.67157 3 2 3.67157 2 4.5V11.5C2 12.3284 2.67157 13 3.5 13H12.5C13.3284 13 14 12.3284 14 11.5V6.5C14 5.67157 13.3284 5 12.5 5H8.16421C7.76639 5 7.38486 4.84197 7.10355 4.56066L5.68934 3.14645C5.59557 3.05268 5.46839 3 5.33579 3H3.5Z"
    fill-opacity="0.6"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M3.5 3C2.67157 3 2 3.67157 2 4.5V11.5C2 12.3284 2.67157 13 3.5 13H12.5C13.3284 13 14 12.3284 14 11.5V6.5C14 5.67157 13.3284 5 12.5 5H8.16421C7.76639 5 7.38486 4.84197 7.10355 4.56066L5.68934 3.14645C5.59557 3.05268 5.46839 3 5.33579 3H3.5Z"
    fill-opacity="0.1"
  />
</svg>
