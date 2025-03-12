import { ExportFormatter } from '../formatter'

type AttributeFormatter = (value: any) => Record<string, any>

export class TalantsFormatter extends ExportFormatter {
  private readonly skipAttributes = new Set<string>([
    '_class',
    'avatarType',
    'docUpdateMessages',
    'notification:mixin:Collaborators',
    'space'
  ])

  private readonly attributeKeyMap = new Map<string, string>([
    ['city', 'location'],
    ['name', 'talant'],
    ['title', 'applications'],
    ['title', 'attachments'],
    ['title', 'comments'],
    ['title', 'contactInfo'],
    ['title', 'birthday'],
    ['title', 'source'],
    ['title', 'github']
  ])

  private readonly attributeFormatterMap = new Map<string, AttributeFormatter>([
    ['recruit:mixin:Candidate', (value: any) => {
      return Object.entries(value)
        .reduce((acc: Record<string, any>, [key, value]) => {
          acc[key] = value
          return acc
        }, {})
    }],
    ['channels', (value: any[]) => {
      // Group channels by provider
      const groupedByProvider: Record<string, string[]> = value.reduce((acc: Record<string, string[]>, channel) => {
        const { provider, value } = channel.data
        if (provider === undefined || value === undefined) {
          return acc
        }

        if (acc[provider] === undefined) {
          acc[provider] = []
        }

        acc[provider].push(value)
        return acc
      }, {})

      // Convert arrays of values to comma-separated strings
      const result: Record<string, string> = {}
      for (const [provider, values] of Object.entries(groupedByProvider)) {
        result[provider] = values.join(', ')
      }

      return result
    }]
  ])

  public isAttributeNeeded (key: string): boolean {
    return !this.skipAttributes.has(key)
  }

  public formatAttribute (key: string, value: any): Record<string, any> {
    if (!this.isAttributeNeeded(key)) {
      return {}
    }

    const formatter = this.attributeFormatterMap.get(key)
    if (formatter !== undefined) {
      return formatter(value)
    }

    const formattedKey = this.formatAttributeKey(key)
    return { [formattedKey]: value }
  }

  private formatAttributeKey (key: string): string {
    return this.attributeKeyMap.get(key) ?? key
  }
}
