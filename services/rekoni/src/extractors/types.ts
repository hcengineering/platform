export interface DocumentExtractor {
  isMatch: (fileName: string, type: string, data: Buffer) => Promise<boolean>
  extract: (fileName: string, type: string, data: Buffer) => Promise<string>
}
