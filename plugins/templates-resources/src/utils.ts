import { Class, Doc, generateId, Ref } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import templates, {
  TemplateData,
  TemplateDataProvider,
  TemplateField,
  TemplateFieldCategory
} from '@hcengineering/templates'

const fieldRegexp = /\$\{(\S+?)}/gi

const templateData: Map<Ref<TemplateFieldCategory>, TemplateData[]> = new Map()

class TemplateDataProviderImpl implements TemplateDataProvider {
  private readonly id = generateId()

  set (key: Ref<Class<Doc>>, value: any): void {
    const data = templateData.get(key) ?? []
    data.unshift({
      owner: this.id,
      data: value
    })
    templateData.set(key, data)
  }

  get (key: Ref<Class<Doc>>): any | undefined {
    const data = templateData.get(key) ?? []
    const current = data.find((p) => p.owner === this.id)
    return current?.data ?? data[0]?.data
  }

  async fillTemplate (message: string): Promise<string> {
    while (true) {
      const matched = fieldRegexp.exec(message)
      if (matched === null) return message
      const client = getClient()
      const field = await client.findOne(templates.class.TemplateField, { _id: matched[1] as Ref<TemplateField> })
      if (field === undefined) continue
      const f = await getResource(field.func)
      const result = await f(this)
      if (result !== undefined) {
        message = message.replaceAll(matched[0], result)
        fieldRegexp.lastIndex = 0
      }
    }
  }

  destroy (): void {
    for (const key of templateData.keys()) {
      const data = templateData.get(key) ?? []
      const res = data.filter((p) => p.owner !== this.id)
      templateData.set(key, res)
    }
  }
}

export function getTemplateDataProvider (): TemplateDataProviderImpl {
  return new TemplateDataProviderImpl()
}
