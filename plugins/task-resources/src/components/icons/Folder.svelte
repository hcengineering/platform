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
  <path
    d="M14.5,6.7c0-2,0-3-0.7-3.8C13,2.2,12,2.2,10,2.2H6c-0.2,0-0.4,0-0.6,0l-0.1,0v0c-1.5,0-2.5,0.1-3.1,0.7 C1.5,3.6,1.5,4.7,1.5,6.7v2.7c0,2,0,3,0.7,3.8C3,13.8,4,13.8,6,13.8h4c2,0,3,0,3.8-0.7c0.5-0.5,0.7-1.3,0.7-2.4h0V10 c0-0.1,0-0.3,0-0.4c0-0.1,0-0.2,0-0.3V6.7z M13.1,3.6c0.4,0.4,0.4,1.3,0.4,3.1v0c-0.1-0.1-0.2-0.2-0.3-0.2c-0.6-0.3-1.2-0.3-2.5-0.3 c-0.7,0-1.1,0-1.3-0.1C9.2,6,9,5.9,8.9,5.8C8.7,5.6,8.5,5.3,8.2,4.6L7.6,3.5C7.6,3.3,7.5,3.3,7.4,3.2H10C11.7,3.2,12.6,3.2,13.1,3.6 z M10,12.8H6c-1.7,0-2.6,0-3.1-0.4C2.5,12,2.5,11.1,2.5,9.3V6.7c0-1.7,0-2.6,0.4-3.1c0.4-0.4,1.1-0.4,2.5-0.4l0.1,0 c0.5,0,1,0.3,1.2,0.8l0.6,1.1c0.4,0.7,0.6,1.1,0.9,1.4C8.4,6.7,8.7,6.9,9,7c0.4,0.2,0.9,0.2,1.7,0.2c1.1,0,1.7,0,2,0.2 c0.2,0.1,0.4,0.3,0.6,0.6c0.2,0.3,0.2,0.9,0.2,1.9c0,1.4,0,2.2-0.4,2.6C12.6,12.8,11.7,12.8,10,12.8z"
  />
</svg>
