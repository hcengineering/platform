// Core interfaces for True Huly Format

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
