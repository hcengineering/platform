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

<svg class="svg-{size}" width="16" height="16" viewBox="0 0 16 16" {fill} xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M4.5 2C3.94772 2 3.5 2.44772 3.5 3V13C3.5 13.5523 3.94772 14 4.5 14H11.5C12.0523 14 12.5 13.5523 12.5 13V6H10.5C9.39543 6 8.5 5.10457 8.5 4V2H4.5ZM9.5 2.20711V4C9.5 4.55228 9.94772 5 10.5 5H12.2929L9.5 2.20711ZM2.5 3C2.5 1.89543 3.39543 1 4.5 1H9.29289C9.55811 1 9.81246 1.10536 10 1.29289L13.2071 4.5C13.3946 4.68754 13.5 4.94189 13.5 5.20711V13C13.5 14.1046 12.6046 15 11.5 15H4.5C3.39543 15 2.5 14.1046 2.5 13V3ZM5 8.5C5 8.22386 5.22386 8 5.5 8H10.5C10.7761 8 11 8.22386 11 8.5C11 8.77614 10.7761 9 10.5 9H5.5C5.22386 9 5 8.77614 5 8.5ZM5 11.5C5 11.2239 5.22386 11 5.5 11H10.5C10.7761 11 11 11.2239 11 11.5C11 11.7761 10.7761 12 10.5 12H5.5C5.22386 12 5 11.7761 5 11.5Z"
    {fill}
  />
</svg>
