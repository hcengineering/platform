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
  <path d="M15.3,14.7h-0.7V4c0-0.3-0.2-0.6-0.5-0.6l-7.3-2c-0.2-0.1-0.4,0-0.6,0.1C6.1,1.6,6,1.8,6,2v3.3H2 C1.6,5.3,1.3,5.6,1.3,6v8.7H0.7C0.3,14.7,0,15,0,15.3C0,15.7,0.3,16,0.7,16h14.7c0.4,0,0.7-0.3,0.7-0.7C16,15,15.7,14.7,15.3,14.7z M2.7,14.7v-8h6v8H2.7z M9.3,5.3h-2V2.9l6,1.6v10.2H10V6C10,5.6,9.7,5.3,9.3,5.3z"/>
</svg>
