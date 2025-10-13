<script lang="ts">
  import { isOffice, Room, RoomAccess, roomAccessIcon } from '@hcengineering/love'
  import love from '../../../plugin'
  import { ButtonBaseSize, eventToHTMLElement, ModernButton, showPopup } from '@hcengineering/ui'
  import RoomAccessPopup from '../../RoomAccessPopup.svelte'
  import { getCurrentEmployee } from '@hcengineering/contact'

  export let room: Room
  export let size: ButtonBaseSize = 'large'
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'

  const me = getCurrentEmployee()

  function setAccess (e: MouseEvent): void {
    if (isOffice(room) && room.person !== me) return
    showPopup(RoomAccessPopup, { room }, eventToHTMLElement(e))
  }
</script>

<ModernButton
  icon={roomAccessIcon[room.access]}
  iconProps={{
    fill:
      room.access === RoomAccess.Open
        ? 'var(--bg-positive-default)'
        : room.access === RoomAccess.DND
          ? 'var(--bg-negative-default)'
          : 'currentColor'
  }}
  tooltip={{ label: love.string.ChangeAccess }}
  {kind}
  {size}
  disabled={isOffice(room) && room.person !== me}
  on:click={setAccess}
/>
