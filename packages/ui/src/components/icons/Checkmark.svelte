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
  export let size: 'tiny' | 'small' | 'medium' | 'large'
  export let fill = 'currentColor'
</script>

<svg class="svg-{size}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" {fill}>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M9.58525 3.53975C9.80492 3.75942 9.80492 4.11558 9.58525 4.33525L5.27275 8.64775C5.05308 8.86742 4.69692 8.86742 4.47725 8.64775L2.41475 6.58525C2.19508 6.36558 2.19508 6.00942 2.41475 5.78975C2.63442 5.57008 2.99058 5.57008 3.21025 5.78975L4.875 7.4545L8.78975 3.53975C9.00942 3.32008 9.36558 3.32008 9.58525 3.53975Z"
  />
</svg>
