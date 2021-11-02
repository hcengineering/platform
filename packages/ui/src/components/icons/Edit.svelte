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

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M15.4,14.5h-6c-0.3,0-0.6,0.3-0.6,0.6s0.3,0.6,0.6,0.6h6c0.3,0,0.6-0.3,0.6-0.6S15.7,14.5,15.4,14.5z"/>
  <path d="M12.2,7.1C12.2,7.1,12.2,7.1,12.2,7.1c1.5-1.9,1.6-2,1.6-2c0.3-0.5,0.5-1.2,0.3-1.8c-0.1-0.6-0.5-1.2-1-1.5 c0,0-1.4-1.1-1.4-1.1c-1-0.8-2.6-0.7-3.4,0.3c0,0,0,0,0,0l-7.7,9.7c-0.4,0.5-0.5,1.1-0.4,1.7l0.7,2.8c0.1,0.3,0.3,0.5,0.6,0.5 c0,0,0,0,0,0l3,0c0.6,0,1.2-0.3,1.5-0.8C9.1,10.9,11,8.5,12.2,7.1C12.1,7.1,12.2,7.1,12.2,7.1z M9.1,1.9c0.4-0.5,1.2-0.6,1.7-0.2 c0,0,1.4,1.1,1.5,1.1c0.3,0.2,0.5,0.4,0.5,0.7c0.1,0.3,0,0.6-0.1,0.8c0,0.1-0.5,0.6-1.2,1.5L8.1,3.2L9.1,1.9z M4.9,14.2 c-0.1,0.2-0.4,0.3-0.6,0.3l-2.5,0l-0.6-2.4c-0.1-0.2,0-0.4,0.1-0.6l5.9-7.4l3.5,2.7C9.1,9,6.5,12.2,4.9,14.2z"/>
</svg>
