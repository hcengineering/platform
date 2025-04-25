import { Class, Data, Doc, Mixin, Ref, Space, Blob as PlatformBlob, DocumentUpdate } from '@hcengineering/core'
export type Props<T extends Doc> = Data<T> & Partial<Doc> & { space: Ref<Space> }

export interface UnifiedDoc<T extends Doc> {
  _class: Ref<Class<T>>
  props: Props<T>
  collabField?: string
  contentProvider?: () => Promise<string>
}

export interface UnifiedMixin<T extends Doc, M extends Doc> {
  _class: Ref<Class<T>>
  mixin: Ref<Mixin<M>>
  props: Props<M>
}

export interface UnifiedUpdate<T extends Doc> {
  _class: Ref<Class<T>>
  _id: Ref<T>
  space: Ref<Space>
  props: DocumentUpdate<T>
}

export interface UnifiedFile {
  _id: Ref<PlatformBlob>
  name: string
  type: string
  size: number
  blobProvider: blobProvider
}

export type contentProvider = () => Promise<string>
export type blobProvider = () => Promise<Blob>
