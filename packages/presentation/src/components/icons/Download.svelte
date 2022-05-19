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
  <path d="M12,8.8c-0.2,0-0.4-0.1-0.5-0.4c-0.2-0.5-0.6-1-1-1.3v1.6c0,0.1,0.1,0.1,0.1,0.2c0.2,0.5,0.7,1,1.4,1c0.8,0,1.5,0.7,1.5,1.5 s-0.7,1.5-1.5,1.5H8H4c-0.8,0-1.5-0.7-1.5-1.5S3.2,9.8,4,9.8c0.7,0,1.2-0.5,1.4-1c0-0.1,0.1-0.1,0.1-0.2V7.1c-0.4,0.4-0.8,0.8-1,1.3 C4.4,8.7,4.2,8.8,4,8.8c-1.4,0-2.5,1.1-2.5,2.5s1.1,2.5,2.5,2.5h4h4c1.4,0,2.5-1.1,2.5-2.5S13.4,8.8,12,8.8z" />
  <path d="M7.5,3.2v5.5c0,0.3,0.2,0.5,0.5,0.5c0.3,0,0.5-0.2,0.5-0.5V3.2L10.3,5L11,4.3L8.4,1.6L8,1.3L7.6,1.6L8,2l0,0L7.6,1.6L5,4.3 L5.7,5L7.5,3.2z" />
</svg>
