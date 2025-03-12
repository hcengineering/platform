export class ExportFormatter {
  public isAttributeNeeded (key: string): boolean {
    return true
  }

  public formatAttribute (key: string, value: any): Record<string, any> {
    return { [key]: value }
  }
}
