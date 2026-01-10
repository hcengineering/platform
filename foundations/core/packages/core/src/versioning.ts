import { Class, Doc, PersonId, Ref } from './classes'

export interface VersionableDoc extends Doc {
  baseId?: Ref<Doc>
  version?: number
  isLatest?: boolean
  docCreatedBy?: PersonId
  readonly?: boolean
}

export interface VersionableClass extends Class<Doc> {
  enabled: boolean
}
