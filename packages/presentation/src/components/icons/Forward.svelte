<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
    d="M11.4,7.7L5.7,2.1C5.5,1.9,5.2,1.9,5,2.1S4.8,2.6,5,2.8L10.3,8L5,13.3c-0.2,0.2-0.2,0.5,0,0.7c0.1,0.1,0.2,0.1,0.4,0.1s0.3,0,0.4-0.1l5.6-5.6c0.1-0.1,0.1-0.2,0.1-0.4S11.4,7.8,11.4,7.7z"
  />
</svg>
