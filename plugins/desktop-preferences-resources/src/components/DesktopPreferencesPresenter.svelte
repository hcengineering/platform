<script lang="ts">
  import core, { Doc, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Grid, Label, Toggle } from '@hcengineering/ui'

  import desktopPreferences, { PreferenceKey } from '@hcengineering/desktop-preferences'

  import { activePreferences } from '../utils'

  $: if (!$activePreferences.showNotifications && $activePreferences.playSound) {
    doUpdate('playSound', false)
  }

  async function doUpdate (propName: PreferenceKey, value: any): Promise<void> {
    if ('_id' in $activePreferences) {
      await getClient().update($activePreferences, { [propName]: value })
    } else {
      await getClient().createDoc(desktopPreferences.class.DesktopNotificationPreference, core.space.Workspace, {
        attachedTo: '' as Ref<Doc>,
        ...$activePreferences,
        [propName]: value
      })
    }
  }

  function updater (propName: PreferenceKey) {
    return (e: CustomEvent) => {
      doUpdate(propName, e.detail)
    }
  }
</script>

<div class="flex-grow vScroll w-full">
  <div class="container">
    <Grid column={2} columnGap={5} rowGap={1.5}>
      <div class="flex">
        <Label label={desktopPreferences.string.ShowNotifications} />
      </div>
      <div class="toggle">
        <Toggle on={$activePreferences.showNotifications} on:change={updater('showNotifications')} />
      </div>
      <div class="flex" class:disabled={!$activePreferences.showNotifications}>
        <Label label={desktopPreferences.string.PlaySound} />
      </div>
      <div class="toggle">
        <Toggle
          on={$activePreferences.playSound}
          disabled={!$activePreferences.showNotifications}
          on:change={updater('playSound')}
        />
      </div>
      <div class="flex">
        <Label label={desktopPreferences.string.BounceAppIcon} />
      </div>
      <div class="toggle">
        <Toggle on={$activePreferences.bounceAppIcon} on:change={updater('bounceAppIcon')} />
      </div>
      <div class="flex">
        <Label label={desktopPreferences.string.ShowBadge} />
      </div>
      <div class="toggle">
        <Toggle on={$activePreferences.showUnreadCounter} on:change={updater('showUnreadCounter')} />
      </div>
    </Grid>
  </div>
</div>

<style lang="scss">
  .container {
    width: fit-content;
  }

  .toggle {
    width: fit-content;
  }

  .disabled {
    opacity: 0.8;
  }
</style>
