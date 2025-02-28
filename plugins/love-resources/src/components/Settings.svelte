<script lang="ts">
  import { getCurrentAccount, Ref, Space } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Breadcrumb, Header, Label, Toggle } from '@hcengineering/ui'
  import { DevicesPreference } from '@hcengineering/love'
  import love from '../plugin'
  import { myPreferences } from '../stores'
  import { krispProcessor } from '../utils'
  import { isKrispNoiseFilterSupported } from '@livekit/krisp-noise-filter'

  const client = getClient()

  async function saveMicPreference (myPreferences: DevicesPreference | undefined, value: boolean): Promise<void> {
    if (myPreferences !== undefined) {
      await client.update(myPreferences, { micEnabled: !value })
    } else {
      const space = getCurrentAccount().uuid as unknown as Ref<Space>
      await client.createDoc(love.class.DevicesPreference, space, {
        attachedTo: space,
        noiseCancellation: true,
        micEnabled: !value,
        camEnabled: true,
        blurRadius: 0
      })
    }
  }

  async function saveCamPreference (myPreferences: DevicesPreference | undefined, value: boolean): Promise<void> {
    if (myPreferences !== undefined) {
      await client.update(myPreferences, { camEnabled: !value })
    } else {
      const space = getCurrentAccount().uuid as unknown as Ref<Space>
      await client.createDoc(love.class.DevicesPreference, space, {
        attachedTo: space,
        noiseCancellation: true,
        camEnabled: !value,
        micEnabled: true,
        blurRadius: 0
      })
    }
  }

  async function saveNoiseCancellationPreference (
    myPreferences: DevicesPreference | undefined,
    value: boolean
  ): Promise<void> {
    if (myPreferences !== undefined) {
      await client.update(myPreferences, { noiseCancellation: value })
    } else {
      const space = getCurrentAccount().uuid as unknown as Ref<Space>
      await client.createDoc(love.class.DevicesPreference, space, {
        attachedTo: space,
        noiseCancellation: value,
        camEnabled: true,
        micEnabled: true,
        blurRadius: 0
      })
    }
    await krispProcessor.setEnabled(value)
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={love.icon.Love} label={love.string.Settings} size={'large'} isCurrent />
  </Header>
  <div class="flex-row-stretch flex-grow p-10">
    <div class="flex-grow flex-col flex-gap-4">
      <div class="flex-row-center flex-gap-4">
        <Label label={love.string.StartWithMutedMic} />
        <Toggle
          on={!($myPreferences?.micEnabled ?? false)}
          on:change={(e) => {
            saveMicPreference($myPreferences, e.detail)
          }}
        />
      </div>
      <div class="flex-row-center flex-gap-4">
        <Label label={love.string.StartWithoutVideo} />
        <Toggle
          on={!($myPreferences?.camEnabled ?? false)}
          on:change={(e) => {
            saveCamPreference($myPreferences, e.detail)
          }}
        />
      </div>
      <div class="flex-row-center flex-gap-4">
        <Label label={love.string.NoiseCancellation} />
        <Toggle
          disabled={!isKrispNoiseFilterSupported()}
          on={isKrispNoiseFilterSupported() && ($myPreferences?.noiseCancellation ?? true)}
          showTooltip={!isKrispNoiseFilterSupported()
            ? { label: love.string.NoiseCancellationNotSupported }
            : undefined}
          on:change={(e) => {
            saveNoiseCancellationPreference($myPreferences, e.detail)
          }}
        />
      </div>
    </div>
  </div>
</div>
