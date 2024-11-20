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

export type Ref<T extends Obj> = string & { __ref: T }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Class<T extends Obj> = Obj
export type Data<T extends Obj> = Omit<T, keyof Obj>

// TODO: should we have any security?
// TODO: attachments?

export interface Obj {
  _id: Ref<this>
  _class: Ref<Class<this>>
  createdBy: string // should be socialId from @account, for now account _id
  createdOn?: number
}

// DB
export interface Message extends Obj {
  content: string

  attachedTo: string
  attachedToClass: string
}

export interface Reaction extends Obj {
  emoji: string
  attachedTo: Ref<Message>
}

export interface Patch extends Obj {
  attachedTo: Ref<Message>
  content: string
}

// Common Types
export type WithPatches = Message & {
  patches?: Patch[]
}

export type WithReactions = Message & {
  reactions?: Reaction[]
}

export type RichMessage = Message & WithPatches & WithReactions

// Query
interface Operator<T extends Obj, P extends keyof T> {
  $in?: T[P][]
  $lt?: T[P]
  $lte?: T[P]
  $gt?: T[P]
  $gte?: T[P]
}

export type Query<T extends Obj> = {
  [P in keyof T]?: T[P] | Operator<T, P>
}

export enum SortingOrder {
  Ascending = 1,
  Descending = -1
}

export type SortingQuery<T extends Obj> = {
  [P in keyof T]?: SortingOrder
} & Record<string, SortingOrder>

export interface Options<T extends Obj> {
  limit?: number
  sort?: SortingQuery<T>
}
