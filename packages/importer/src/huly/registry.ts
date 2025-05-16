//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { Tag } from '@hcengineering/card'
import { Association, Attribute, Blob as PlatformBlob, Doc, generateId, Ref } from '@hcengineering/core'
import { UnifiedDoc } from '../types'
import { v4 as uuid } from 'uuid'

export interface AssociationMetadata {
  association: Ref<Association>
  field: 'docA' | 'docB'
  type: '1:1' | '1:N' | 'N:N'
}
export type MapAttributeToUnifiedDoc = Map<string, UnifiedDoc<Attribute<Tag>>>
export type MapNameToAssociation = Map<string, AssociationMetadata>

export interface TagMetadata {
  _id: string
  attributes: MapAttributeToUnifiedDoc
  associations: MapNameToAssociation
}

export interface MentionMetadata {
  id: Ref<Doc>
  class: string
  refTitle: string
}

export class MetadataRegistry {
  private readonly pathToRef = new Map<string, Ref<Doc>>()
  private readonly refToPath = new Map<Ref<Doc>, string>()
  private readonly refToEnumValues = new Map<Ref<Doc>, string[]>()
  private readonly pathToBlobUuid = new Map<string, Ref<PlatformBlob>>()
  private readonly pathToTagMetadata = new Map<string, TagMetadata>()
  private readonly pathToMentionMetadata = new Map<string, MentionMetadata>()

  public getRef (path: string): Ref<Doc> {
    let ref = this.pathToRef.get(path)
    if (ref === undefined) {
      ref = generateId()
      this.pathToRef.set(path, ref)
      this.refToPath.set(ref, path)
    }
    return ref
  }

  public getPath (ref: Ref<Doc>): string | undefined {
    return this.refToPath.get(ref)
  }

  public getBlobUuid (path: string): Ref<PlatformBlob> {
    let blobUuid = this.pathToBlobUuid.get(path)
    if (blobUuid === undefined) {
      blobUuid = uuid() as Ref<PlatformBlob>
      this.pathToBlobUuid.set(path, blobUuid)
    }
    return blobUuid
  }

  public getEnumValues (ref: Ref<Doc>): string[] {
    return this.refToEnumValues.get(ref) ?? []
  }

  public setEnumValues (path: string, values: string[]): void {
    const ref = this.getRef(path)
    this.refToEnumValues.set(ref, values)
  }

  public getAttributes (path: string): MapAttributeToUnifiedDoc {
    return this.pathToTagMetadata.get(path)?.attributes ?? new Map()
  }

  public getAssociations (path: string): MapNameToAssociation {
    return this.pathToTagMetadata.get(path)?.associations ?? new Map()
  }

  public setAttributes (path: string, attributes: MapAttributeToUnifiedDoc): void {
    const metadata = this.pathToTagMetadata.get(path) ?? {
      _id: this.getRef(path),
      attributes: new Map(),
      associations: new Map()
    }
    metadata.attributes = attributes
    this.pathToTagMetadata.set(path, metadata)
  }

  public addAssociation (tagPath: string, propName: string, relationMetadata: AssociationMetadata): void {
    const metadata = this.pathToTagMetadata.get(tagPath) ?? {
      _id: this.getRef(tagPath),
      attributes: new Map(),
      associations: new Map()
    }
    metadata.associations.set(propName, relationMetadata)
    this.pathToTagMetadata.set(tagPath, metadata)
  }

  public setRefMetadata (path: string, _class: string, title: string, id?: Ref<Doc>): void {
    const ref = id ?? this.getRef(path)
    this.pathToMentionMetadata.set(path, {
      id: ref,
      class: _class,
      refTitle: title
    })
  }

  public hasRefMetadata (path: string): boolean {
    return this.pathToMentionMetadata.has(path)
  }

  public getRefMetadata (path: string): MentionMetadata {
    return (
      this.pathToMentionMetadata.get(path) ?? {
        id: this.getRef(path),
        class: '',
        refTitle: ''
      }
    )
  }
}
