import { Doc, generateId, Ref } from '@hcengineering/core'
import path from 'path'

export class PathToRefResolver {
  private readonly pathToRef = new Map<string, Ref<Doc>>()

  public getIdByFullPath (path: string): Ref<Doc> {
    let id = this.pathToRef.get(path)
    if (id === undefined) {
      id = generateId()
      this.pathToRef.set(path, id)
    }
    return id
  }

  public getIdByRelativePath (currentPath: string, relativePath: string): Ref<Doc> {
    const fullPath = path.resolve(currentPath, relativePath)
    return this.getIdByFullPath(fullPath)
  }
}
