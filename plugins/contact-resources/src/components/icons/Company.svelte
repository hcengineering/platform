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
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M3.25 3C3.11193 3 2.99836 2.88751 3.01541 2.7505C3.13822 1.76368 3.97992 1 5 1H11C12.0201 1 12.8618 1.76368 12.9846 2.7505C13.0016 2.88751 12.8881 3 12.75 3L3.25 3Z" />
  <path fill-rule="evenodd" clip-rule="evenodd" d="M3.5 4C3.22386 4 3 4.22386 3 4.5V14.5C3 14.7761 3.22386 15 3.5 15H5.5C5.77614 15 6 14.7761 6 14.5V12.5C6 12.2239 6.22386 12 6.5 12H9.5C9.77614 12 10 12.2239 10 12.5V14.5C10 14.7761 10.2239 15 10.5 15H12.5C12.7761 15 13 14.7761 13 14.5V4.5C13 4.22386 12.7761 4 12.5 4H3.5ZM11 8C10.4477 8 10 8.44772 10 9V9.6C10 9.82091 10.1791 10 10.4 10H11.6C11.8209 10 12 9.82091 12 9.6V9C12 8.44772 11.5523 8 11 8ZM10 6C10 5.44772 10.4477 5 11 5C11.5523 5 12 5.44772 12 6V6.6C12 6.82091 11.8209 7 11.6 7H10.4C10.1791 7 10 6.82091 10 6.6V6ZM8 5C7.44772 5 7 5.44772 7 6V6.6C7 6.82091 7.17909 7 7.4 7H8.6C8.82091 7 9 6.82091 9 6.6V6C9 5.44772 8.55228 5 8 5ZM7 9C7 8.44772 7.44772 8 8 8C8.55228 8 9 8.44772 9 9V9.6C9 9.82091 8.82091 10 8.6 10H7.4C7.17909 10 7 9.82091 7 9.6V9ZM5 8C4.44772 8 4 8.44772 4 9V9.6C4 9.82091 4.17909 10 4.4 10H5.6C5.82091 10 6 9.82091 6 9.6V9C6 8.44772 5.55228 8 5 8ZM4 6C4 5.44772 4.44772 5 5 5C5.55228 5 6 5.44772 6 6V6.6C6 6.82091 5.82091 7 5.6 7H4.4C4.17909 7 4 6.82091 4 6.6V6Z" />
</svg>
