<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { themeStore } from '@hcengineering/theme'
  import { ColorMetaNameOrHex } from '../drawingUtils'
  import { DrawingBoardColoringSetup, metaColorNameToHex } from '../drawingColors'

  export let color: ColorMetaNameOrHex = 'alpha'
  export let palette: DrawingBoardColoringSetup
</script>

<div class="colorIcon" style:background={metaColorNameToHex(color, $themeStore.variant, palette)} />

<style lang="scss">
  .colorIcon {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    margin: -0.15rem;
    box-shadow: 0px 0px 0.15rem 0px var(--theme-button-contrast-enabled);
  }
</style>
