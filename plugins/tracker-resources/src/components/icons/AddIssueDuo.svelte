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

<svg class="svg-{size}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path
    fill="var(--duotone-color)"
    d="M3,11c0-3.8,0-5.7,1.2-6.8C5.3,3,7.2,3,11,3h2c3.8,0,5.7,0,6.8,1.2C21,5.3,21,7.2,21,11v2c0,3.8,0,5.7-1.2,6.8C18.7,21,16.8,21,13,21h-2c-3.8,0-5.7,0-6.8-1.2C3,18.7,3,16.8,3,13V11z"
  />
  <polygon
    {fill}
    points="16,11.5 12.5,11.5 12.5,8 11.5,8 11.5,11.5 8,11.5 8,12.5 11.5,12.5 11.5,16 12.5,16 12.5,12.5 16,12.5 "
  />
</svg>
