export interface Metadata {
  msg2fileUrl: string
}

export function getMetadata(): Metadata {
  return {
    msg2fileUrl: process.env.MSG2FILE_URL ?? ''
  }
}
