//
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
//

import contact, { Employee, Person, formatName, getName } from '@hcengineering/contact'
import core, {
  concatLink,
  Doc,
  Ref,
  Timestamp,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxProcessor,
  TxUpdateDoc,
  UserStatus,
  combineAttributes,
  type PersonUuid,
  type AccountUuid
} from '@hcengineering/core'
import love, {
  Invite,
  isOffice,
  JoinRequest,
  loveId,
  MeetingMinutes,
  MeetingStatus,
  Office,
  ParticipantInfo,
  RequestStatus,
  Room,
  RoomAccess,
  RoomInfo
} from '@hcengineering/love'
import notification from '@hcengineering/notification'
import { getMetadata, translate } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import { getSocialStrings } from '@hcengineering/server-contact'
import {
  createPushNotification,
  getNotificationProviderControl,
  isAllowed
} from '@hcengineering/server-notification-resources'
import { workbenchId } from '@hcengineering/workbench'
import view from '@hcengineering/view'

export async function OnEmployee (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const actualTx = tx as TxMixin<Person, Employee>
    if (actualTx._class !== core.class.TxMixin) {
      continue
    }
    if (actualTx.mixin !== contact.mixin.Employee) {
      continue
    }
    const val = actualTx.attributes.active
    if (val === undefined) {
      continue
    }
    if (val) {
      const freeRoom = (await control.findAll(control.ctx, love.class.Office, { person: null }))[0]
      if (freeRoom !== undefined) {
        return [
          control.txFactory.createTxUpdateDoc(freeRoom._class, freeRoom.space, freeRoom._id, {
            person: actualTx.objectId
          })
        ]
      }
    } else {
      const room = (await control.findAll(control.ctx, love.class.Office, { person: actualTx.objectId }))[0]
      if (room !== undefined) {
        result.push(
          control.txFactory.createTxUpdateDoc(room._class, room.space, room._id, {
            person: null
          })
        )
      }
    }
  }
  return result
}

async function createUserInfo (user: PersonUuid, control: TriggerControl): Promise<Tx[]> {
  const person = (await control.findAll(control.ctx, contact.class.Person, { personUuid: user }))[0]
  if (person === undefined) return []

  // we already have participantInfo for this person
  const infos = await control.findAll(control.ctx, love.class.ParticipantInfo, { person: person._id })
  if (infos.length > 0) return []

  const room = (await control.findAll(control.ctx, love.class.Office, { person: person._id }))[0]
  const tx = control.txFactory.createTxCreateDoc(love.class.ParticipantInfo, core.space.Workspace, {
    person: person._id,
    name: person !== undefined ? getName(control.hierarchy, person, control.branding?.lastNameFirst) : 'User',
    room: room?._id ?? love.ids.Reception,
    x: 0,
    y: 0,
    sessionId: null
  })
  const ptx = control.txFactory.createTxApplyIf(
    core.space.Workspace,
    user,
    [],
    [
      {
        _class: love.class.ParticipantInfo,
        query: { person: person._id }
      }
    ],
    [tx],
    'createUserInfo'
  )
  return [ptx]
}

async function removeUserInfo (user: AccountUuid, control: TriggerControl): Promise<Tx[]> {
  const person = (await control.findAll(control.ctx, contact.class.Person, { personUuid: user }))[0]
  if (person === undefined) return []

  // recheck that user is still offline
  const status = (await control.findAll(control.ctx, core.class.UserStatus, { user }))[0]
  if (status !== undefined && status.online) return []

  const infos = await control.findAll(control.ctx, love.class.ParticipantInfo, { person: person._id })
  const res: Tx[] = []
  for (const info of infos) {
    res.push(control.txFactory.createTxRemoveDoc(info._class, info.space, info._id))
  }
  return res
}

export async function OnUserStatus (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const actualTx = tx as TxCUD<UserStatus>
    if (actualTx.objectClass !== core.class.UserStatus) {
      continue
    }
    if (actualTx._class === core.class.TxCreateDoc) {
      const createTx = actualTx as TxCreateDoc<UserStatus>
      const status = TxProcessor.createDoc2Doc(createTx)
      result.push(...(await createUserInfo(status.user, control)))
    } else if (actualTx._class === core.class.TxUpdateDoc) {
      const updateTx = actualTx as TxUpdateDoc<UserStatus>
      const val = updateTx.operations.online
      if (val === undefined) return []
      const status = (await control.findAll(control.ctx, core.class.UserStatus, { _id: updateTx.objectId }))[0]
      if (status !== undefined) {
        if (val) {
          result.push(...(await createUserInfo(status.user, control)))
        } else {
          result.push(...(await removeUserInfo(status.user, control)))
        }
      }
    }
  }
  return result
}

async function roomJoinHandler (info: ParticipantInfo, control: TriggerControl): Promise<Tx[]> {
  const roomInfos = await control.queryFind(control.ctx, love.class.RoomInfo, {})
  const roomInfo = roomInfos.find((ri) => ri.room === info.room)
  if (roomInfo !== undefined && !roomInfo.persons.includes(info.person)) {
    return [
      control.txFactory.createTxUpdateDoc(love.class.RoomInfo, core.space.Workspace, roomInfo._id, {
        $push: { persons: info.person }
      })
    ]
  } else {
    const room = (await control.findAll(control.ctx, love.class.Room, { _id: info.room }))[0]
    if (room === undefined) return []
    return [
      control.txFactory.createTxCreateDoc(love.class.RoomInfo, core.space.Workspace, {
        persons: [info.person],
        room: info.room,
        isOffice: isOffice(room)
      })
    ]
  }
}

async function rejectJoinRequests (info: ParticipantInfo, control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  const roomInfos = await control.queryFind(control.ctx, love.class.RoomInfo, {})
  const oldRoomInfo = roomInfos.find((ri) => ri.persons.includes(info.person))
  if (oldRoomInfo !== undefined) {
    const restPersons = oldRoomInfo.persons.filter((p) => p !== info.person)
    if (restPersons.length === 0) {
      const requests = await control.findAll(control.ctx, love.class.JoinRequest, {
        room: oldRoomInfo.room,
        status: RequestStatus.Pending
      })
      for (const request of requests) {
        res.push(
          control.txFactory.createTxUpdateDoc(love.class.JoinRequest, core.space.Workspace, request._id, {
            status: RequestStatus.Rejected
          })
        )
      }
    }
  }
  return res
}

async function setDefaultRoomAccess (info: ParticipantInfo, control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  const roomInfos = await control.queryFind(control.ctx, love.class.RoomInfo, {})
  const oldRoomInfo = roomInfos.find((ri) => ri.persons.includes(info.person))
  if (oldRoomInfo !== undefined) {
    if (oldRoomInfo.persons.length === 1 && oldRoomInfo.persons[0] === info.person) {
      res.push(control.txFactory.createTxRemoveDoc(oldRoomInfo._class, oldRoomInfo.space, oldRoomInfo._id))

      const resetAccessTx = control.txFactory.createTxUpdateDoc(
        oldRoomInfo.isOffice ? love.class.Office : love.class.Room,
        core.space.Workspace,
        oldRoomInfo.room,
        {
          access: oldRoomInfo.isOffice ? RoomAccess.Knock : RoomAccess.Open
        }
      )
      res.push(resetAccessTx)
    } else {
      res.push(
        control.txFactory.createTxUpdateDoc(love.class.RoomInfo, core.space.Workspace, oldRoomInfo._id, {
          $pull: { persons: info.person }
        })
      )
    }
  }
  return res
}

async function finishRoomMeetings (room: Ref<Room>, meetingEnd: Timestamp, control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  const meetingMinutes = await control.findAll(control.ctx, love.class.MeetingMinutes, {
    attachedTo: room,
    status: MeetingStatus.Active
  })

  for (const meeting of meetingMinutes) {
    res.push(
      control.txFactory.createTxUpdateDoc(meeting._class, meeting.space, meeting._id, {
        status: MeetingStatus.Finished,
        meetingEnd
      })
    )
  }

  return res
}

export async function OnParticipantInfo (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const actualTx = tx as TxCUD<ParticipantInfo>
    if (actualTx._class === core.class.TxCreateDoc) {
      const info = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<ParticipantInfo>)
      result.push(...(await roomJoinHandler(info, control)))
    }
    if (actualTx._class === core.class.TxRemoveDoc) {
      const removedInfo = control.removedMap.get(actualTx.objectId) as ParticipantInfo
      if (removedInfo === undefined) {
        continue
      }
      result.push(...(await setDefaultRoomAccess(removedInfo, control)))
      continue
    }
    if (actualTx._class === core.class.TxUpdateDoc) {
      const newRoom = (actualTx as TxUpdateDoc<ParticipantInfo>).operations.room
      if (newRoom === undefined) {
        continue
      }
      const info = (
        await control.findAll(control.ctx, love.class.ParticipantInfo, { _id: actualTx.objectId }, { limit: 1 })
      )[0]
      if (info === undefined) {
        continue
      }
      result.push(...(await rejectJoinRequests(info, control)))
      result.push(...(await setDefaultRoomAccess(info, control)))
      result.push(...(await roomJoinHandler(info, control)))
    }
  }
  return result
}

export async function OnKnock (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  for (const tx of txes) {
    const actualTx = tx as TxCreateDoc<JoinRequest>
    if (actualTx._class === core.class.TxCreateDoc) {
      const request = TxProcessor.createDoc2Doc(actualTx)
      if (request.status === RequestStatus.Pending) {
        const roomInfo = (await control.findAll(control.ctx, love.class.RoomInfo, { room: request.room }))[0]
        if (roomInfo !== undefined) {
          const from = (await control.findAll(control.ctx, contact.class.Person, { _id: request.person }))[0]
          if (from === undefined) {
            continue
          }
          const type = await control.modelDb.findOne(notification.class.NotificationType, {
            _id: love.ids.KnockNotification
          })
          if (type === undefined) {
            continue
          }
          const provider = await control.modelDb.findOne(notification.class.NotificationProvider, {
            _id: notification.providers.PushNotificationProvider
          })
          if (provider === undefined) {
            continue
          }

          const notificationControl = await getNotificationProviderControl(control.ctx, control)
          for (const user of roomInfo.persons) {
            const socialStrings = await getSocialStrings(control, user)
            if (socialStrings.length === 0) continue
            if (isAllowed(control, socialStrings, type, provider, notificationControl)) {
              const path = [workbenchId, control.workspace.url, loveId]
              const title = await translate(love.string.KnockingLabel, {})
              const body = await translate(love.string.IsKnocking, {
                name: formatName(from.name, control.branding?.lastNameFirst)
              })
              const employee = await control.findAll(
                control.ctx,
                contact.mixin.Employee,
                { _id: user as Ref<Employee> },
                { limit: 1 }
              )
              const account = employee[0]?.personUuid
              if (account === undefined) continue

              const subscriptions = await control.findAll(control.ctx, notification.class.PushSubscription, {
                user: account
              })
              await createPushNotification(control, account, title, body, request._id, subscriptions, from, path)
            }
          }
        }
      }
    }
  }
  return []
}

export async function OnInvite (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  for (const tx of txes) {
    const actualTx = tx as TxCreateDoc<Invite>
    if (actualTx._class === core.class.TxCreateDoc) {
      const invite = TxProcessor.createDoc2Doc(actualTx)
      if (invite.status === RequestStatus.Pending) {
        const target = (
          await control.findAll(
            control.ctx,
            contact.mixin.Employee,
            { _id: invite.target as Ref<Employee> },
            { limit: 1 }
          )
        )[0]
        if (target === undefined) {
          continue
        }
        const from = (await control.findAll(control.ctx, contact.class.Person, { _id: invite.from }))[0]
        const type = await control.modelDb.findOne(notification.class.NotificationType, {
          _id: love.ids.InviteNotification
        })
        if (type === undefined) {
          continue
        }
        const provider = await control.modelDb.findOne(notification.class.NotificationProvider, {
          _id: notification.providers.PushNotificationProvider
        })
        if (provider === undefined) {
          continue
        }
        const notificationControl = await getNotificationProviderControl(control.ctx, control)
        const socialStrings = await getSocialStrings(control, target._id)
        if (isAllowed(control, socialStrings, type, provider, notificationControl)) {
          const path = [workbenchId, control.workspace.url, loveId]
          const title = await translate(love.string.InivitingLabel, {})
          const body =
            from !== undefined
              ? await translate(love.string.InvitingYou, {
                name: formatName(from.name, control.branding?.lastNameFirst)
              })
              : await translate(love.string.InivitingLabel, {})
          const account = target?.personUuid
          if (account === undefined) continue
          const subscriptions = await control.findAll(control.ctx, notification.class.PushSubscription, {
            user: account
          })
          await createPushNotification(control, account, title, body, invite._id, subscriptions, from, path)
        }
      }
    }
  }
  return []
}

export async function meetingMinutesHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const meetingMinutes = doc as MeetingMinutes
  const front = control.branding?.front ?? getMetadata(serverCore.metadata.FrontUrl) ?? ''

  const panelProps = [view.component.EditDoc, meetingMinutes._id, meetingMinutes._class]
  const fragment = encodeURIComponent(panelProps.join('|'))
  const path = `${workbenchId}/${control.workspace.url}/${loveId}#${fragment}`
  const link = concatLink(front, path)
  return `<a href="${link}">${meetingMinutes.title}</a>`
}

/**
 * @public
 */
export async function meetingMinutesTextPresenter (doc: Doc): Promise<string> {
  const meetingMinutes = doc as MeetingMinutes
  return meetingMinutes.title
}

async function isRoomEmpty (
  room: Ref<Room>,
  isOffice: boolean,
  persons: Ref<Person>[],
  control: TriggerControl
): Promise<boolean> {
  if (persons.length === 0) return true
  if (isOffice && persons.length === 1) {
    const office = (await control.findAll(control.ctx, love.class.Office, { _id: room as Ref<Office> }))[0]
    if (office === undefined) return true
    return office.person != null && office.person === persons[0]
  }

  return false
}

async function OnRoomInfo (txes: TxCUD<RoomInfo>[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  const personsByRoom = new Map<Ref<RoomInfo>, Ref<Person>[]>()
  for (const tx of txes) {
    if (tx._class === core.class.TxRemoveDoc) {
      const roomInfo = control.removedMap.get(tx.objectId) as RoomInfo
      if (roomInfo === undefined) continue
      if (roomInfo.room === love.ids.Reception) continue
      personsByRoom.delete(tx.objectId)
      result.push(...(await finishRoomMeetings(roomInfo.room, tx.modifiedOn, control)))
      continue
    }
    if (tx._class === core.class.TxUpdateDoc) {
      const updateTx = tx as TxUpdateDoc<RoomInfo>
      const pulled = combineAttributes([updateTx.operations], 'persons', '$pull', '$in')
      const pushed = combineAttributes([updateTx.operations], 'persons', '$push', '$each')

      if (pulled.length === 0 && pushed.length === 0) continue
      const roomInfos = await control.queryFind(control.ctx, love.class.RoomInfo, {})
      const roomInfo = roomInfos.find((r) => r._id === tx.objectId)
      if (roomInfo === undefined) continue
      if (roomInfo.room === love.ids.Reception) continue

      const currentPersons = personsByRoom.get(tx.objectId) ?? roomInfo.persons
      const newPersons = currentPersons.filter((p) => !pulled.includes(p)).concat(pushed)

      personsByRoom.set(tx.objectId, newPersons)

      if (await isRoomEmpty(roomInfo.room, roomInfo.isOffice, newPersons, control)) {
        result.push(...(await finishRoomMeetings(roomInfo.room, tx.modifiedOn, control)))
      }
    }
  }
  return result
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    MeetingMinutesHTMLPresenter: meetingMinutesHTMLPresenter,
    MeetingMinutesTextPresenter: meetingMinutesTextPresenter
  },
  trigger: {
    OnEmployee,
    OnUserStatus,
    OnParticipantInfo,
    OnRoomInfo,
    OnKnock,
    OnInvite
  }
})
