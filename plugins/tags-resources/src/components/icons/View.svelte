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
    d="M12,8c-2.2,0-4,1.8-4,4c0,2.2,1.8,4,4,4c2.2,0,4-1.8,4-4C16,9.8,14.2,8,12,8z M12,15c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3 S13.7,15,12,15z"
  />
  <path
    d="M20.6,10.6l-0.4,0.3l-0.4,0.3c0.4,0.5,0.5,0.6,0.5,0.7s-0.1,0.3-0.5,0.7c-1.5,1.8-4.4,4.8-7.8,4.8c-3.4,0-6.3-3-7.8-4.8 c-0.4-0.5-0.5-0.6-0.5-0.7c0-0.2,0.1-0.3,0.5-0.7C5.7,9.5,8.6,6.5,12,6.5c3.4,0,6.3,3,7.8,4.8l0.4-0.3L20.6,10.6L20.6,10.6 C19,8.7,15.8,5.5,12,5.5c-3.8,0-7,3.2-8.6,5.1C3,11.1,2.7,11.5,2.7,12s0.3,0.9,0.7,1.4c1.6,1.9,4.8,5.1,8.6,5.1 c3.8,0,7-3.2,8.6-5.1c0.4-0.5,0.7-0.8,0.7-1.4S21,11.1,20.6,10.6z"
  />
</svg>
