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
    d="M13.1,7.5H4.3l3.1-3.1L6.7,3.6l-4,4L2.4,8l0.4,0.4l4,4l0.6-0.8L4.3,8.5h8.8c0.3,0,0.5-0.2,0.5-0.5S13.3,7.5,13.1,7.5z"
  />
</svg>
