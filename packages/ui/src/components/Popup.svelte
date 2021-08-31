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
  import { popupstore as modal } from '..'
  import PopupInstance from './PopupInstance.svelte'

  // function close () {
  //   console.log('closeX')
  // }

  function handleKeydown (ev: KeyboardEvent) {
    // if (ev.key === 'Escape' && $modal.is) {
    //   close()
    // }
  }

</script>

<svelte:window on:keydown={handleKeydown} />

{#each $modal as popup}
  <PopupInstance is={popup.is} props={popup.props} element={popup.element} />
{/each}

