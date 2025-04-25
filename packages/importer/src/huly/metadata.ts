import { Tag } from '@hcengineering/card'
import { Association, Attribute, Doc, generateId, generateUuid, Blob as PlatformBlob, Ref } from '@hcengineering/core'
import { UnifiedDoc } from '../types'

export interface RelationMetadata { // todo: rename
  association: Ref<Association>
  field: 'docA' | 'docB'
  type: '1:1' | '1:N' | 'N:N'
}
export type MapAttributeToUnifiedDoc = Map<string, UnifiedDoc<Attribute<Tag>>>
export type MapNameToIsMany = Map<string, RelationMetadata> // todo: rename

export interface TagMetadata {
  _id: string
  attributes: MapAttributeToUnifiedDoc // title -> attribute id
  associations: MapNameToIsMany // nameB -> isMany
}

export class MetadataStorage {
  private readonly pathToRef = new Map<string, Ref<Doc>>() // todo: attachments to a separate map?
  private readonly pathToMetadata = new Map<string, TagMetadata>()
  private readonly pathToBlobUuid = new Map<string, Ref<PlatformBlob>>()

  public getRefByPath (path: string): Ref<Doc> {
    let ref = this.pathToRef.get(path)
    if (ref === undefined) {
      ref = generateId()
      this.pathToRef.set(path, ref)
    }
    return ref
  }

  public getUuidByPath (path: string): Ref<PlatformBlob> {
    let uuid = this.pathToBlobUuid.get(path)
    if (uuid === undefined) {
      uuid = generateUuid() as Ref<PlatformBlob>
      this.pathToBlobUuid.set(path, uuid)
    }
    return uuid
  }

  public hasMetadata (path: string): boolean {
    return this.pathToMetadata.has(path)
  }

  public getAttributes (path: string): MapAttributeToUnifiedDoc {
    return this.pathToMetadata.get(path)?.attributes ?? new Map()
  }

  public getAssociations (path: string): MapNameToIsMany {
    return this.pathToMetadata.get(path)?.associations ?? new Map()
  }

  public setAttributes (path: string, attributes: MapAttributeToUnifiedDoc): void {
    const metadata = this.pathToMetadata.get(path) ?? {
      _id: this.getRefByPath(path),
      attributes: new Map(),
      associations: new Map()
    }
    metadata.attributes = attributes
    this.pathToMetadata.set(path, metadata)
  }

  public addAssociation (tagPath: string, propName: string, relationMetadata: RelationMetadata): void {
    const metadata = this.pathToMetadata.get(tagPath) ?? {
      _id: this.getRefByPath(tagPath),
      attributes: new Map(),
      associations: new Map()
    }
    metadata.associations.set(propName, relationMetadata)
    this.pathToMetadata.set(tagPath, metadata)
  }
}
