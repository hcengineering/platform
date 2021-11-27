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
  const fill: string = 'var(--theme-caption-color)'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M12.1,11.7c2.1,0,3.8-1.7,3.8-3.8s-1.7-3.8-3.8-3.8S8.4,5.8,8.4,7.9S10.1,11.7,12.1,11.7z M12.1,5.5 c1.3,0,2.3,1.1,2.3,2.3s-1.1,2.3-2.3,2.3S9.8,9.2,9.8,7.9S10.8,5.5,12.1,5.5z"
  />
  <path
    d="M12,0C5.4,0,0,5.4,0,12c0,6.6,5.4,12,12,12c6.6,0,12-5.4,12-12C24,5.4,18.6,0,12,0z M12,22.6 C6.2,22.6,1.4,17.8,1.4,12C1.4,6.2,6.2,1.4,12,1.4c5.8,0,10.6,4.7,10.6,10.6C22.6,17.8,17.8,22.6,12,22.6z"
  />
  <path
    d="M18.6,16.2c-0.3-0.9-0.8-1.6-1.5-2.2c-0.9-0.7-2-1.1-3.1-1.1h-1.5h-0.9h-1.5c-1.1,0-2.2,0.4-3.1,1.1 c-0.7,0.6-1.2,1.3-1.5,2.2l-0.2,0.6c-0.1,0.4,0.1,0.8,0.5,0.9c0.1,0,0.1,0,0.2,0c0.3,0,0.6-0.2,0.7-0.5L7,16.7 c0.2-0.6,0.5-1.1,1-1.5c0.6-0.5,1.4-0.8,2.2-0.8h1.5h0.9h1.5c0.8,0,1.6,0.3,2.2,0.8c0.5,0.4,0.8,0.9,1,1.5l0.2,0.6 c0.1,0.3,0.4,0.5,0.7,0.5c0.1,0,0.1,0,0.2,0c0.4-0.1,0.6-0.5,0.5-0.9L18.6,16.2z"
  />
</svg>
