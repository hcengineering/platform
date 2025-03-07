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
  import { getCurrentEmployee, formatName } from '@hcengineering/contact'
  import { personByIdStore } from '@hcengineering/contact-resources'
  import { translate } from '@hcengineering/platform'
  import { Ref } from '@hcengineering/core'
  import love, { isOffice, Room } from '@hcengineering/love'
  import { Dropdown, Icon } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { rooms } from '../stores'

  export let value: Ref<Room> | undefined
  export let disabled: boolean = false
  export let focusIndex = -1

  const dispatch = createEventDispatcher()

  $: currentPersonId = getCurrentEmployee()

  $: items = $rooms
    .filter((room) => {
      if (room._id === love.ids.Reception) {
        return false
      }
      if (isOffice(room)) {
        return room.person === currentPersonId
      }
      return true
    })
    .map((room) => makeRoomItem(room, false))

  $: selectedRoom = $rooms.find((p) => p._id === value)
  $: selected = selectedRoom !== undefined ? makeRoomItem(selectedRoom, true) : undefined

  function makeRoomItem (room: Room, forSelected: boolean): { _id: string, label: string } {
    const item = { _id: room._id, label: room.name }
    if (isOffice(room)) {
      if (room.person === currentPersonId) {
        translate(love.string.MyOffice, {})
          .then((res) => {
            item.label = res
            if (forSelected) {
              selected = { ...item }
            } else {
              items = [...items]
            }
          })
          .catch((err) => {
            console.error(err)
          })
      } else if (room.person !== null) {
        const person = $personByIdStore.get(room.person)
        if (person !== undefined) {
          translate(love.string.Office, {})
            .then((res) => {
              item.label = `${res} (${formatName(person.name)})`
              if (forSelected) {
                selected = { ...item }
              } else {
                items = [...items]
              }
            })
            .catch((err) => {
              console.error(err)
            })
        }
      } else {
        translate(love.string.Office, {})
          .then((res) => {
            item.label = res
            if (forSelected) {
              selected = { ...item }
            } else {
              items = [...items]
            }
          })
          .catch((err) => {
            console.error(err)
          })
      }
    }
    return item
  }

  function change (id: Ref<Room>): void {
    if (value !== id) {
      dispatch('change', id)
      value = id
    }
  }
</script>

{#if items.length > 0}
  <div class="flex-row-center flex-gap-1">
    <Icon icon={love.icon.Mic} size={'small'} />
    <Dropdown
      kind={'ghost'}
      size={'medium'}
      placeholder={love.string.Room}
      {items}
      withSearch={false}
      {selected}
      {disabled}
      {focusIndex}
      on:selected={(e) => {
        change(e.detail._id)
      }}
    />
  </div>
{/if}
