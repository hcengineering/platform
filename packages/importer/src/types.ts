import { Class, Data, Doc, Ref, Space } from '@hcengineering/core'

export interface UnifiedDoc<T extends Doc> {
  _class: Ref<Class<T>>
  props: Props<T>
  markdownFields?: string[]
  collabField?: string
  contentProvider?: () => Promise<string>
}

export type Props<T extends Doc> = Data<T> & Partial<Doc> & { space: Ref<Space> }

export interface ImportContext {
  vars: Record<string, any>
  defaults: Map<Ref<Class<Doc>>, Props<Doc>>
}

export type contentProvider = () => Promise<string>
