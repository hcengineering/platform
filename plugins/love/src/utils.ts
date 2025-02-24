import { Employee, Person } from '@hcengineering/contact'
import { Data, generateId, Ref } from '@hcengineering/core'

import love, { Office, Room, ParticipantInfo, RoomAccess, RoomType, GRID_WIDTH } from '.'

interface Slot {
  _id?: Ref<Room>
  width: number
  height: number
  x: number
  y: number
}

export function isOffice (room: Data<Room>): room is Office {
  return (room as Office).person !== undefined
}

export function createDefaultRooms (employees: Ref<Employee>[]): (Data<Room | Office> & { _id: Ref<Room> })[] {
  const res: (Data<Room | Office> & { _id: Ref<Room> })[] = []
  // create 12 offices
  for (let index = 0; index < 12; index++) {
    const _id = generateId<Office>()
    const office: Data<Office> & { _id: Ref<Office> } = {
      _id,
      name: '',
      type: RoomType.Audio,
      access: RoomAccess.Knock,
      floor: love.ids.MainFloor,
      width: 2,
      height: 1,
      x: (index % 2) * 3,
      y: index - (index % 2),
      person: employees[index] ?? null,
      language: 'en',
      startWithTranscription: false,
      startWithRecording: false,
      description: null
    }
    res.push(office)
  }
  const allHands = generateId<Room>()

  res.push({
    _id: allHands,
    name: 'All hands',
    type: RoomType.Video,
    access: RoomAccess.Open,
    floor: love.ids.MainFloor,
    width: 9,
    height: 3,
    x: 6,
    y: 0,
    language: 'en',
    startWithTranscription: true,
    startWithRecording: true,
    description: null
  })

  const meetingRoom1 = generateId<Room>()
  res.push({
    _id: meetingRoom1,
    name: 'Meeting Room 1',
    type: RoomType.Video,
    access: RoomAccess.Open,
    floor: love.ids.MainFloor,
    width: 4,
    height: 3,
    x: 6,
    y: 4,
    language: 'en',
    startWithTranscription: true,
    startWithRecording: true,
    description: null
  })
  const meetingRoom2 = generateId<Room>()
  res.push({
    _id: meetingRoom2,
    name: 'Meeting Room 2',
    type: RoomType.Video,
    access: RoomAccess.Open,
    floor: love.ids.MainFloor,
    width: 4,
    height: 3,
    x: 11,
    y: 4,
    language: 'en',
    startWithTranscription: true,
    startWithRecording: true,
    description: null
  })
  const voiceRoom1 = generateId<Room>()
  res.push({
    _id: voiceRoom1,
    name: 'Voice Room 1',
    type: RoomType.Audio,
    access: RoomAccess.Open,
    floor: love.ids.MainFloor,
    width: 4,
    height: 3,
    x: 6,
    y: 8,
    language: 'en',
    startWithTranscription: false,
    startWithRecording: false,
    description: null
  })
  const voiceRoom2 = generateId<Room>()
  res.push({
    _id: voiceRoom2,
    name: 'Voice Room 2',
    type: RoomType.Audio,
    access: RoomAccess.Open,
    floor: love.ids.MainFloor,
    width: 4,
    height: 3,
    x: 11,
    y: 8,
    language: 'en',
    startWithTranscription: false,
    startWithRecording: false,
    description: null
  })
  return res
}

const cropMaxWidth = (width: number): number => {
  return width > GRID_WIDTH ? GRID_WIDTH : width
}

export function getFreeSpace (rooms: Slot[], exclude?: Slot, completeExclusion?: boolean): boolean[][] {
  const sorted = [...rooms].sort((a, b) => a.y - b.y)
  const map: boolean[][] = [new Array(GRID_WIDTH).fill(true)]

  for (const room of sorted) {
    const excluded: boolean = exclude?._id === room._id
    for (
      let y = room.y === 0 ? 0 : excluded ? room.y : room.y - 1;
      y < room.y + room.height + (excluded ? 0 : 1);
      y++
    ) {
      if (map[y] === undefined) {
        map[y] = new Array(GRID_WIDTH).fill(true)
      }
      for (
        let x = room.x === 0 ? 0 : excluded ? room.x : room.x - 1;
        x <
        (room.x + room.width - 1 < GRID_WIDTH
          ? excluded
            ? cropMaxWidth(room.x + room.width)
            : cropMaxWidth(room.x + room.width + 1)
          : GRID_WIDTH - 1);
        x++
      ) {
        map[y][x] = completeExclusion === true && excluded
      }
    }
  }
  map.push(new Array(GRID_WIDTH).fill(true))

  return map
}

export function getFreePosition (
  rooms: Slot[],
  width: number,
  height: number
): {
    x: number
    y: number
  } {
  const map: boolean[][] = getFreeSpace(rooms)

  for (let y = 0; y <= map.length; y++) {
    if (map[y] === undefined) {
      map[y] = new Array(GRID_WIDTH).fill(true)
    }
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x]) {
        let matched = true
        for (let yIndex = 0; yIndex < height; yIndex++) {
          if (map[y + yIndex] === undefined) {
            map[y + yIndex] = new Array(GRID_WIDTH).fill(true)
          }
          for (let xIndex = 0; xIndex < width; xIndex++) {
            if (!map[y + yIndex][x + xIndex]) {
              matched = false
              break
            }
          }
        }
        if (matched) {
          return {
            x,
            y
          }
        }
      }
    }
  }

  return {
    x: 0,
    y: 0
  }
}

export function checkIntersection (rooms: Slot[], width: number, height: number, x: number, y: number): boolean {
  for (const room of rooms) {
    if (x <= room.x + room.width && x + width >= room.x && y <= room.y + room.height && y + height >= room.y) {
      return true
    }
  }
  return false
}

export interface ScreenSource {
  id: string
  name: string
  thumbnailURL: string
  appIconURL: string
}

export function getFreeRoomPlace (room: Room, info: ParticipantInfo[], person: Ref<Person>): { x: number, y: number } {
  let y = 0
  while (true) {
    for (let x = 0; x < room.width; x++) {
      if (info.find((p) => p.x === x && p.y === y) === undefined) {
        if (x === 0 && y === 0 && isOffice(room)) {
          if (room.person === person) {
            return { x: 0, y: 0 }
          }
        } else {
          return { x, y }
        }
      }
    }
    y++
  }
}
