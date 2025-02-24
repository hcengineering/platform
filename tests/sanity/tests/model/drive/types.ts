export interface Drive {
  spaceType?: string
  name: string
  description?: string
  owners?: string[]
  private?: boolean
  members?: string[]
}

export type ButtonDrivesContextMenu = 'Create folder' | 'Edit drive' | 'Archive' | 'Unarchive' | 'Leave' | 'Join'

export type ButtonFilesContextMenu = 'Rename' | 'Download' | 'Move' | 'Delete'
