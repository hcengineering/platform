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
  export let size: 'x-small' | 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M8.7,9.8C8.2,10.4,8,11.2,8,12c0,2.2,1.8,4,4,4c0.8,0,1.6-0.2,2.2-0.7l-0.7-0.7C13,14.9,12.5,15,12,15c-1.7,0-3-1.3-3-3 c0-0.5,0.1-1,0.4-1.5L8.7,9.8z"
  />
  <path
    d="M12,17.5c-1.7,0-3.3-0.7-4.6-1.7c-1.4-1-2.5-2.2-3.2-3c-0.4-0.5-0.5-0.6-0.5-0.7s0-0.2,0.5-0.7c0.7-0.8,1.7-2,3-2.9 L6.5,7.6c-1.3,1-2.4,2.2-3.1,3l-0.1,0.1C3,11.1,2.7,11.5,2.7,12s0.3,0.9,0.6,1.3l0.1,0.1c0.7,0.9,1.9,2.1,3.4,3.2 c1.5,1,3.3,1.9,5.2,1.9c1.5,0,2.9-0.5,4.2-1.2l-0.7-0.7C14.4,17.1,13.2,17.5,12,17.5z"
  />
  <path
    d="M18.9,15.2c0.7-0.7,1.3-1.3,1.7-1.8l0.1-0.1c0.3-0.4,0.6-0.8,0.6-1.3s-0.3-0.9-0.6-1.3l-0.1-0.1c-0.7-0.9-1.9-2.1-3.4-3.2 c-1.5-1-3.3-1.9-5.2-1.9c-0.8,0-1.6,0.2-2.4,0.4L5.4,1.6L4.6,2.4l16,16l0.7-0.7L18.9,15.2z M12,6.5c1.7,0,3.3,0.7,4.6,1.7 c1.4,1,2.5,2.2,3.2,3c0.4,0.5,0.5,0.6,0.5,0.7s0,0.2-0.5,0.7c-0.4,0.5-1,1.1-1.6,1.7L16,12.3c0-0.1,0-0.2,0-0.3c0-2.2-1.8-4-4-4 c-0.1,0-0.2,0-0.3,0l-1.3-1.3C10.9,6.6,11.5,6.5,12,6.5z M14.9,11.2l-2-2C13.8,9.4,14.6,10.2,14.9,11.2z"
  />
</svg>
