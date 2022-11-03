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
  export let fill: string = 'transparent'
  export let border: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path
    {fill}
    d="M8.7,2.5L10,5.1c0.1,0.3,0.3,0.4,0.6,0.5l2.7,0.4c0.7,0.1,0.9,1,0.5,1.5l-2,2c-0.2,0.2-0.3,0.5-0.2,0.8L12,13c0.1,0.7-0.6,1.2-1.2,0.9l-2.4-1.3c-0.2-0.1-0.5-0.1-0.8,0l-2.4,1.3C4.6,14.2,3.9,13.7,4,13l0.5-2.8c0-0.3,0-0.6-0.2-0.8l-2-2C1.8,6.9,2,6,2.7,5.9l2.7-0.4c0.3,0,0.5-0.2,0.6-0.5l1.2-2.6C7.6,1.8,8.4,1.8,8.7,2.5z"
  />
  <path
    fill={border}
    d="M4.8,14.5c-0.3,0-0.5-0.1-0.7-0.2c-0.4-0.3-0.6-0.8-0.6-1.3L4,10.1c0-0.1,0-0.2-0.1-0.3l-2-2C1.5,7.4,1.4,6.8,1.6,6.3c0.2-0.5,0.6-0.8,1.1-0.9L5.4,5c0.1,0,0.2-0.1,0.2-0.2l1.2-2.6C7,1.8,7.5,1.5,8,1.5s1,0.3,1.2,0.8c0,0,0,0,0,0l1.2,2.6c0,0.1,0.1,0.2,0.2,0.2l2.7,0.4c0.5,0.1,0.9,0.4,1.1,0.9c0.2,0.5,0,1-0.3,1.4l-2,2C12.1,9.8,12,10,12,10.1l0.5,2.8c0.1,0.5-0.1,1-0.6,1.3c-0.4,0.3-0.9,0.3-1.4,0.1L8.1,13c-0.1,0-0.2,0-0.3,0l-2.4,1.3C5.2,14.4,5,14.5,4.8,14.5z M8,2.5c-0.1,0-0.2,0-0.3,0.2L6.5,5.3C6.3,5.7,5.9,6,5.5,6L2.8,6.4c-0.2,0-0.2,0.2-0.3,0.2c0,0.1-0.1,0.2,0.1,0.4l2,2C4.9,9.4,5,9.8,4.9,10.2l-0.5,2.8c0,0.2,0.1,0.3,0.1,0.4c0.1,0,0.2,0.1,0.3,0l2.4-1.3c0.4-0.2,0.9-0.2,1.2,0l2.4,1.3c0.1,0.1,0.3,0,0.3,0c0,0,0.2-0.1,0.1-0.4l-0.5-2.8c-0.1-0.4,0.1-0.9,0.4-1.2l2-2c0.1-0.2,0.1-0.3,0.1-0.4c0-0.1-0.1-0.2-0.3-0.2L10.5,6c-0.4-0.1-0.8-0.3-1-0.7L8.3,2.7C8.2,2.5,8.1,2.5,8,2.5z"
  />
</svg>
