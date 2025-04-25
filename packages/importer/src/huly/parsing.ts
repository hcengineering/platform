import * as fs from 'fs'
import * as yaml from 'js-yaml'

export async function readYamlHeader (filePath: string): Promise<any> {
  const content = fs.readFileSync(filePath, 'utf8')
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (match != null) {
    return yaml.load(match[1])
  }
  return {}
}

export async function readMarkdownContent (filePath: string): Promise<string> {
  const content = fs.readFileSync(filePath, 'utf8')
  const match = content.match(/^---\n[\s\S]*?\n---\n(.*)$/s)
  return match != null ? match[1] : content
}
