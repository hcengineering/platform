<!-- Copyright © 2026 Huly Contributors. Licensed under the Eclipse Public License, Version 2.0. -->
<script lang="ts">
  import { createQuery, createWorkspaceFavicon, getFileUrl } from '@hcengineering/presentation'
  import setting, { type WorkspaceSetting } from '@hcengineering/setting'
  import { onMount } from 'svelte'

  let workspaceSetting: WorkspaceSetting | undefined
  let settingsLoaded = false
  let favicon: ReturnType<typeof createWorkspaceFavicon> | undefined
  const query = createQuery()
  query.query(setting.class.WorkspaceSetting, { _id: setting.ids.WorkspaceSetting }, (result) => {
    workspaceSetting = result[0]
    settingsLoaded = true
  })
  $: logoUrl = workspaceSetting?.icon != null ? getFileUrl(workspaceSetting.icon) : undefined
  $: if (settingsLoaded) void favicon?.update(logoUrl, workspaceSetting?.identificationColor, {
    syncLogo: workspaceSetting?.syncWorkspaceLogo === true,
    showColor: workspaceSetting?.identificationColorEnabled === true
  })

  onMount(() => {
    favicon = createWorkspaceFavicon()
    return () => favicon?.dispose()
  })
</script>
