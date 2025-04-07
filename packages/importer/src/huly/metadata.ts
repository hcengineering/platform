import { Tag } from '@hcengineering/card'
import { Association, Attribute, Doc, generateId, Ref } from '@hcengineering/core'
import path from 'path'
import { UnifiedDoc } from '../types'

export interface RelationMetadata {
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
  private readonly pathToRef = new Map<string, Ref<Doc>>()
  private readonly pathToMetadata = new Map<string, TagMetadata>()

  public getIdByFullPath (path: string): Ref<Doc> {
    let id = this.pathToRef.get(path)
    if (id === undefined) {
      id = generateId()
      this.pathToRef.set(path, id)
    }
    return id
  }

  public getIdByRelativePath (currentPath: string, relativePath: string): Ref<Doc> {
    const fullPath = path.resolve(currentPath, relativePath)
    return this.getIdByFullPath(fullPath)
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
      _id: this.getIdByFullPath(path),
      attributes: new Map(),
      associations: new Map()
    }
    metadata.attributes = attributes
    this.pathToMetadata.set(path, metadata)
  }

  public addAssociation (tagPath: string, propName: string, relationMetadata: RelationMetadata): void {
    const metadata = this.pathToMetadata.get(tagPath) ?? {
      _id: this.getIdByFullPath(tagPath),
      attributes: new Map(),
      associations: new Map()
    }
    metadata.associations.set(propName, relationMetadata)
    this.pathToMetadata.set(tagPath, metadata)
  }
}
