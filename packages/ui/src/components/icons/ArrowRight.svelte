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
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M2.4,8c0,0.3,0.2,0.5,0.5,0.5h8.8l-3.1,3.1l0.6,0.8l4-4L13.6,8l-0.3-0.4l-4-4L8.6,4.4l3.1,3.1l-8.8,0C2.7,7.5,2.4,7.7,2.4,8z"
  />
</svg>
