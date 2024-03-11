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
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 20 28" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M0 4.00012C0 1.79098 1.79086 0.00012207 4 0.00012207H16C18.2091 0.00012207 20 1.79098 20 4.00012V27.0001C20 27.3689 19.797 27.7078 19.4719 27.8818C19.1467 28.0558 18.7522 28.0367 18.4453 27.8322L10 22.202L1.5547 27.8322C1.24784 28.0367 0.8533 28.0558 0.528142 27.8818C0.202985 27.7078 0 27.3689 0 27.0001V4.00012ZM4 2.00012C2.89543 2.00012 2 2.89555 2 4.00012V25.1316L9.4453 20.1681C9.7812 19.9441 10.2188 19.9441 10.5547 20.1681L18 25.1316V4.00012C18 2.89555 17.1046 2.00012 16 2.00012H4Z"
  />
</svg>
