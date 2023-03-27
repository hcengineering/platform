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

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path d="M0.8,7.3v7c0,0.5,0.4,0.9,0.9,0.9h1.4V6.3H1.7C1.2,6.3,0.8,6.8,0.8,7.3z" />
  <path
    d="M13.3,6.3H9.8c0.5-0.9,1.3-3,0.8-4.2C10,0.7,8.2,0.6,8,0.9C7.8,1.3,5.8,4.7,4.8,6.3v8.9h6.5c1.9,0,2.6-0.7,2.8-1.5c0.2-0.9,0.7-3.3,1-5S14.2,6.3,13.3,6.3z"
  />
</svg>
