import attachment from '@hcengineering/attachment'
import core, {
  AttachedData,
  Client,
  Data,
  Ref,
  SortingOrder,
  TxOperations,
  WorkspaceId,
  generateId
} from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import tracker, {
  Issue,
  IssuePriority,
  IssueStatus,
  Project,
  TimeReportDayType,
  calcRank,
  createStatuses
} from '@hcengineering/tracker'
import { readFile } from 'fs/promises'
import { getType } from 'mime'
import { v4 as uuid } from 'uuid'
import { InitOperation } from './types'
import path = require('path')

interface InitData {
  title: string
  description: string
  attachments: string[]
}

const issues: InitData[] = [
  {
    attachments: [],
    title: 'Добро пожаловать в Bold',
    description: `Добро пожаловать. Выполните эти задания, чтобы узнать, как использовать Bold. Когда вы закончите, удалите их или оставьте чтобы другие могли их просмотреть.
Чтобы создать задачу просто нажмите С находясь в приложении трекера или нажмите кнопку «Новая задача».
Наш редактор задач и комментарии поддерживают Markdown. Вы также можете:
@упомянуть товарища по команде или любой другой объект.
Перетаскивайте и прикрепляйте изображения, видео иили любые другие файлы
Используйте смайлики ✅`
  },
  {
    attachments: [],
    title: 'Попробуйте 3 способа навигации: командная строка, клавиатура или мышь.',
    description: `Cmd/Ctrl K — наша самая мощная функция.
Используйте его для поиска или выполнения любых действий в приложении.
Если Вы предпочитаете сочетания клавиш, Вы можете просмотреть полный список доступных сочетаний нажав на «Помощь».
Если вы предпочитаете использовать мышь, щелкните правой кнопкой мыши для вызова контекстного меню.`
  },
  {
    attachments: [],
    title: 'Настройка представлений с помощью параметров отображения и фильтров',
    description: `Настройте порядок сортировки списка и выберите, какие свойства будут отображаться в задачах с помощью параметров отображения.
Изменения сохраняются как личные предпочтения.
Используйте фильтры, это позволит эффективно сконцентрировать внимание только на тех данных которые нужны сейчас.
Они будут применяться только к данному представлению (а не к другим представлениям или представлениям ваших товарищей по команде) и будут сохраняться до тех пор, пока не будут удалены.
Вы можете сохранить фильтр и быстро переходить к нему, а так же поделиться им с товарищами`
  },
  {
    attachments: [],
    title: 'Настройки',
    description: `В настройках вы можете настроить свой профиль и уведомелния которые хотите получать.
Также вы можете настроить рабочее пространство, изменить права доступа других пользователей, и если необходимо добавить дополнительные свойства Вашим объектам 
    `
  }
]

async function createProject (client: TxOperations, status: Ref<IssueStatus>): Promise<void> {
  const data: Data<Project> = {
    name: 'Demo project',
    description: 'Project with study issues',
    private: false,
    members: [],
    archived: false,
    identifier: 'DEMO',
    sequence: 0,
    issueStatuses: 0,
    defaultIssueStatus: status,
    defaultTimeReportDay: TimeReportDayType.PreviousWorkDay
  }
  await client.createDoc(tracker.class.Project, core.space.Space, data, tracker.project.DemoProject)
  await createStatuses(
    client,
    tracker.project.DemoProject,
    tracker.class.IssueStatus,
    tracker.attribute.IssueStatus,
    status
  )
}

async function createIssue (
  workspaceId: WorkspaceId,
  client: TxOperations,
  fileStorage: MinioService,
  issue: InitData,
  status: Ref<IssueStatus>
): Promise<void> {
  const lastOne = await client.findOne<Issue>(
    tracker.class.Issue,
    { space: tracker.project.DemoProject },
    { sort: { rank: SortingOrder.Descending } }
  )
  const incResult = await client.updateDoc(
    tracker.class.Project,
    core.space.Space,
    tracker.project.DemoProject,
    {
      $inc: { sequence: 1 }
    },
    true
  )
  const value: AttachedData<Issue> = {
    title: issue.title,
    description: issue.description,
    assignee: null,
    component: null,
    number: (incResult as any).object.sequence,
    status,
    priority: IssuePriority.NoPriority,
    rank: calcRank(lastOne, undefined),
    comments: 0,
    subIssues: 0,
    dueDate: null,
    parents: [],
    reportedTime: 0,
    estimation: 0,
    reports: 0,
    relations: [],
    childInfo: []
  }
  const id = await client.addCollection(
    tracker.class.Issue,
    tracker.project.DemoProject,
    tracker.ids.NoParent,
    tracker.class.Issue,
    'subIssues',
    value
  )

  for (const attach of issue.attachments) {
    const file = await readFile(path.resolve(__dirname, `../attachments/tracker/${attach}`))
    const fileId = uuid()
    await fileStorage.put(workspaceId, fileId, file)
    await client.addCollection(
      attachment.class.Attachment,
      tracker.project.DemoProject,
      id,
      tracker.class.Issue,
      'attachments',
      {
        file: fileId,
        name: attach,
        size: file.length,
        lastModified: Date.now(),
        type: getType(attach) ?? ''
      }
    )
  }
}

export const trackerInit: InitOperation = {
  async initWS (workspaceId: WorkspaceId, client: Client, fileStorage: MinioService): Promise<void> {
    const txOp = new TxOperations(client, core.account.System)
    const statusId: Ref<IssueStatus> = generateId()
    await createProject(txOp, statusId)
    for (const issue of issues) {
      await createIssue(workspaceId, txOp, fileStorage, issue, statusId)
    }
  }
}
