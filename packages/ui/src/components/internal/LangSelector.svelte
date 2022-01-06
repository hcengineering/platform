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
  import { getContext } from 'svelte'
  import { showPopup } from '../..'
  import LangPopup from './LangPopup.svelte'

  import enFlag from './flags/english.svelte'
  import ruFlag from './flags/russia.svelte'

  const { currentLanguage, setLanguage } = getContext('lang')
  const langs
          = [{ id: 'en', label: 'English', icon: enFlag },
             { id: 'ru', label: 'Russian', icon: ruFlag }]

  $: selected = langs.find(item => item.id === currentLanguage)
  let trigger: HTMLElement

  const selectLanguage = (): void => {
    showPopup(LangPopup, { langs }, trigger, (result) => {
      if (result) {
        selected = langs.find(item => item.id === result)
        setLanguage(result)
      }
    })
  }
</script>

{#if selected}
  <div bind:this={trigger} class="flex-center cursor-pointer" on:click={selectLanguage}>
    <svelte:component this={selected.icon} size={'medium'} />
  </div>
{/if}
