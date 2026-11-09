import { Class, Doc, Mixin, PersonId, Ref } from './classes'

export interface VersionableDoc extends Doc {
  baseId?: Ref<Doc>
  version?: number
  isLatest?: boolean
  docCreatedBy?: PersonId
  readonly?: boolean
}

export interface VersionableClass extends Class<Doc> {
  enabled: boolean
  excludedProperties?: string[]
  excludedRelations?: string[] // ${associationId}_${a|b}
  excludeMixins?: Ref<Mixin<Doc>>[]
}
