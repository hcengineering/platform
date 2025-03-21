import { findAll, getOuterHTML, innerText } from 'domutils'
import { parseDocument } from 'htmlparser2'

import { NodeType } from './types'
import { clean } from '../helpers'
import { type Cell } from './common'

export abstract class Container {
  constructor (
    public readonly type: NodeType,
    protected title: string = '',
    protected content: string = '',
    protected text: string = ''
  ) {}

  getContent (): string {
    return this.content
  }

  getText (): string {
    return this.text
  }

  getTitle (): string {
    return this.title
  }

  abstract getArray (): Container[]
}

export class TableContainer extends Container {
  constructor (
    protected title: string = '',
    protected content: string = '',
    protected cells: Map<string, Container> = new Map()
  ) {
    super(NodeType.TABLE, title, content)
  }

  getArray (): Container[] {
    return [...this.cells.values()]
  }

  private getCellIndex (cell: Cell): string {
    return `${cell.row}.${cell.col}`
  }

  private getCell (cell: Cell): Container | undefined {
    return this.cells.get(this.getCellIndex(cell))
  }

  getCellText (cell: Cell): string {
    return this.getCell(cell)?.getText() ?? ''
  }

  getCellContent (cell: Cell): string {
    return this.getCell(cell)?.getContent() ?? ''
  }

  setCell (cell: Cell, container: Container): void {
    this.cells.set(this.getCellIndex(cell), container)
  }
}

export class ListContainer extends Container {
  constructor (
    protected title: string = '',
    protected content: string = '',
    private readonly children: Container[] = []
  ) {
    super(NodeType.LIST, title, content)
  }

  static fromContent (content: string, title: string = ''): ListContainer {
    const doc = parseDocument(content)
    const listElements = findAll((n) => n.tagName === 'li', doc.children).map(
      (n) => new GenericContainer('', getOuterHTML(n), clean(innerText(n)))
    )

    return new ListContainer(title, content, listElements)
  }

  getArray (): Container[] {
    return this.children
  }
}

export class GenericContainer extends Container {
  constructor (
    protected title: string = '',
    protected content: string = '',
    protected text: string = ''
  ) {
    super(NodeType.GENERIC, title, content, text)
  }

  getArray (): Container[] {
    return []
  }
}
