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
    d="M16,2.2c0.1-0.8-0.7-1.4-1.4-1.1L0.4,7.2c-0.6,0.3-0.4,1,0,1.1l3,1C3.9,9.5,4.5,9.5,5,9.1l6.6-4.6c0.1-0.1,0.4,0.1,0.3,0.3 L7.1,9.8c-0.4,0.4-0.4,1.3,0.1,1.7l5.3,3.4c0.6,0.4,1.4,0,1.5-0.7L16,2.2z"
  />
</svg>
