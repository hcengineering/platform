<script lang="ts">
  import { getClient } from '@anticrm/presentation'
  import setting, { SettingsCategory } from '@anticrm/setting'
  import { Component, getCurrentLocation, Label, location, navigate, setMetadataLocalStorage } from '@anticrm/ui'
  import { onDestroy } from 'svelte'
  import CategoryElement from './CategoryElement.svelte'
  import login from '@anticrm/login'

  const client = getClient()

  let category: SettingsCategory | undefined
  let categoryId: string = ''

  let categories: SettingsCategory[] = []
  client.findAll(setting.class.SettingsCategory, {}, { sort: { order: 1 } }).then(s => {
    categories = s
    category = findCategory(categoryId)
  })

  onDestroy(
    location.subscribe(async (loc) => {
      categoryId = loc.path[2]
      category = findCategory(categoryId)
    })
  )

  function findCategory (name: string): SettingsCategory | undefined {
    return categories.find((x) => x.name === name)
  }
  function selectCategory (id: string): void {
    const loc = getCurrentLocation()
    loc.path[2] = id
    loc.path.length = 3
    navigate(loc)
  }
  function signOut (): void {
    setMetadataLocalStorage(login.metadata.LoginToken, null)
    setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
    setMetadataLocalStorage(login.metadata.LoginEmail, null)
    navigate({ path: [login.component.LoginApp] })
  }
</script>

<div class='container'>
<div class="panel-navigator">
  <div class="flex-between navheader-container">
    <span class="fs-title overflow-label">
      <Label label={setting.string.Settings}/>
    </span>
  </div>
  {#each categories as category}
      <CategoryElement icon={category.icon} label={category.label} on:click={() => { selectCategory(category.name) }}/>
  {/each}
  <div class='signout'>
    <CategoryElement icon={setting.icon.Signout} label={setting.string.Signout} on:click={signOut}/>
  </div>
</div>    

<div class="panel-component">
  {#if category}
    <Component is={category.component} />
  {/if}
</div>
</div>

<style lang="scss">
  .container {
    display: flex;
    height: 100%;
    padding-bottom: 1.25rem;
    background: var(--theme-menu-color); 
   
    .panel-navigator {
      display: flex;
      flex-direction: column;
      margin-right: 1rem;
      min-width: 18rem;
      width: 18rem;
      height: 100%;
      border-radius: 1.25rem;
      background-color: var(--theme-bg-color);

      .signout {
        display: flex;        
        flex-direction: column-reverse;
        flex-grow: 1;
        margin-bottom: 2rem;
      }
    }
    .panel-component {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      margin-right: 1rem;
      height: 100%;
      border-radius: 1.25rem;
      background-color: var(--theme-bg-color);
      overflow: hidden;
    }   
  }
  .navheader-container {
    padding: 0 1.75rem;
    height: 4rem;
  }
</style>

