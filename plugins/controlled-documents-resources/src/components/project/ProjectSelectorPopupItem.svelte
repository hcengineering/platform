<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Project } from '@hcengineering/controlled-documents'

  export let project: Project
  export let onClick: () => void
</script>

<button class="hulyPopup-row" on:click={onClick}>
  <div class="w-full flex flex-gap-2 clear-mins">
    <div class="hulyPopup-row__labels-wrapper">
      <div class="hulyPopup-row__label overflow-label">
        {project.name}
      </div>
    </div>
  </div>
</button>
