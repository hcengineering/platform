<!--
// Copyright © 2020 Anticrm Platform Contributors.
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

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <polygon points="12.6,14.4 12.8,5.1 11.2,5.1 11.4,14.4 " />
  <path d="M12,15.8c-0.6,0-1.2,0.5-1.2,1.2s0.5,1.2,1.2,1.2s1.2-0.5,1.2-1.2S12.6,15.8,12,15.8z" />
  <path
    d="M12,0C5.4,0,0,5.4,0,12s5.4,12,12,12s12-5.4,12-12S18.6,0,12,0z M12,22.5C6.2,22.5,1.5,17.8,1.5,12S6.2,1.5,12,1.5 S22.5,6.2,22.5,12S17.8,22.5,12,22.5z"
  />
</svg>
