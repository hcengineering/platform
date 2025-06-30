<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { tooltip } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  export let title: string
</script>

<span class="text overflow-label" use:tooltip={{ label: getEmbeddedLabel(title) }}>
  {title}
</span>

<style lang="scss">
  .text {
    flex: 1 1 auto;
    max-width: 20rem;
    min-width: 0;
    flex-shrink: 100;
  }
</style>
