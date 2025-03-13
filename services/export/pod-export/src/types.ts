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

export interface UnifiedDoc<T = any> {
  // Base document properties
  _class: string // Class reference (generic, not hardcoded)
  space: string // Space reference
  _id?: string // Optional document ID

  // Document data
  data: UnifiedAttributes<T> // Generic data type

  // Special field handling
  markdownFields?: string[] // Fields that contain markdown content
  collabFields?: string[] // Fields that need collaboration support
  refFields?: string[] // Fields that contain references
  collectionFields?: string[] // Fields that contain collections

  // Attachments handling
  attachments?: UnifiedAttachment[]
}

// Generic data interface that can hold any document properties
type UnifiedAttributes<T = any> = Record<string, T | undefined>

// Attachment model
export interface UnifiedAttachment {
  id: string
  name: string
  size: number
  contentType: string
  getData: () => Promise<Buffer>
}

// Helper type for attached documents
export interface UnifiedAttachedDoc extends UnifiedDoc {
  data: {
    attachedTo: string // Reference to parent document
    attachedToClass: string // Class of parent document
    collection: string // Collection name
    [key: string]: any // Other properties
  }
}
