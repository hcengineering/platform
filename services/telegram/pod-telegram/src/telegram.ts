import bigInt from 'big-integer'
import { Api, Logger, TelegramClient } from 'telegram'
import { computeCheck } from 'telegram/Password'
import type { _MessagesIter } from 'telegram/client/messages'
import type { EntityLike } from 'telegram/define'
import { RPCError } from 'telegram/errors'
import type { NewMessageEvent } from 'telegram/events'
import { NewMessage } from 'telegram/events'
import { StringSession } from 'telegram/sessions'
import type { Dialog } from 'telegram/tl/custom/dialog'
import config from './config'
import { ApiError, Code } from './error'

Logger.setLevel('none')

type SignInState = 'init' | 'code' | 'pass' | 'end'
class SignInFlow {
  private _state: SignInState = 'init'
  private codeHash: string | undefined

  constructor (
    private readonly client: TelegramClient,
    private readonly phone: string,
    private readonly onEnd: () => void
  ) {}

  async init (): Promise<void> {
    if (this._state !== 'init') {
      throw Error('Invalid sign in method')
    }

    const res = await this.client.sendCode(this.creds, this.phone)
    this.codeHash = res.phoneCodeHash
    this._state = 'code'
  }

  get state (): SignInState {
    return this._state
  }

  async code (code: string): Promise<boolean> {
    if (this._state !== 'code') {
      throw Error('Invalid sign in method')
    }

    try {
      const res = await this.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: this.phone,
          phoneCodeHash: this.codeHash,
          phoneCode: code
        })
      )

      if (res instanceof Api.auth.AuthorizationSignUpRequired) {
        throw Error('Account does not exist')
      }

      this.finish()
      return true
    } catch (err: unknown) {
      if (err instanceof RPCError) {
        const untypedErr: any = err
        if (untypedErr.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          this._state = 'pass'
          return false
        }

        if (untypedErr.errorMessage === 'PHONE_CODE_INVALID') {
          throw new ApiError(Code.PhoneCodeInvalid, err.message)
        }
      }

      throw err
    }
  }

  async pass (password: string): Promise<void> {
    if (this._state !== 'pass') {
      throw Error('Invalid sign in method')
    }

    const passSrpRes = await this.client.invoke(new Api.account.GetPassword())
    const passSrpCheck = await computeCheck(passSrpRes, password)
    await this.client.invoke(new Api.auth.CheckPassword({ password: passSrpCheck }))

    this.finish()
  }

  private finish (): void {
    this._state = 'end'
    this.onEnd()
  }

  private get creds (): { apiId: number, apiHash: string } {
    return {
      apiId: this.client.apiId,
      apiHash: this.client.apiHash
    }
  }
}

type Listener = (user: Api.User, msg: Api.Message) => void

class TelegramConnection {
  private _signInFlow: SignInFlow | undefined
  private readonly listeners = new Map<number, Listener>()
  private subID = 0
  private handlerAdded = false
  private readinessInterval: NodeJS.Timeout | undefined
  private connecting = false

  constructor (
    readonly client: TelegramClient,
    readonly phone: string
  ) {
    // Important: this routine is also required to keep getting telegram updates
    // For some reason gramjs (or Telegram API) stops getting updates after minute or so and
    // calling api methods works like workaround
    this.setReadinessInterval()
  }

  setReadinessInterval (): void {
    if (this.readinessInterval === undefined) {
      this.readinessInterval = setInterval(() => {
        void this.reconnect()
      }, 30 * 1000)
    }
  }

  async tryReconnect (): Promise<void> {
    if (this.connecting) {
      return
    }

    if (this.client.connected === true) {
      console.log('Already connected')
      return
    }

    try {
      this.connecting = true
      await this.client.connect()
    } catch (e: unknown) {
      console.error(e)
    } finally {
      this.connecting = false
    }
  }

  async reconnect (): Promise<void> {
    try {
      const ready = await this.isReady()

      if (!ready) {
        await this.tryReconnect()
      }
    } catch (err) {
      console.log(err)
    }
  }

  async close (): Promise<void> {
    if (this.readinessInterval !== undefined) {
      clearInterval(this.readinessInterval)
    }
    this.client.listEventHandlers().forEach(([builder, callback]) => {
      this.client.removeEventHandler(callback, builder)
    })
    await this.client.disconnect()
  }

  async signOut (): Promise<void> {
    await this.client.invoke(new Api.auth.LogOut())
  }

  async signIn (): Promise<void> {
    this._signInFlow = new SignInFlow(this.client, this.phone, () => {
      this._signInFlow = undefined
      this.client.session.save()
    })

    await this._signInFlow.init()
  }

  async isReady (): Promise<boolean> {
    if (this._signInFlow !== undefined) {
      return false
    }

    return await this.client.isUserAuthorized()
  }

  get signInFlow (): typeof this._signInFlow {
    return this._signInFlow
  }

  handleSub (): void {
    if (this.handlerAdded) {
      return
    }

    this.handlerAdded = true
    this.client.addEventHandler((update: NewMessageEvent) => {
      void (async () => {
        if (!(update.isPrivate ?? false)) {
          return
        }

        const user = await update.message.getChat()
        if (user === undefined || user.className !== 'User') {
          return
        }

        for (const listener of this.listeners.values()) {
          listener(user, update.message)
        }
      })()
    }, new NewMessage({}))
  }

  sub (l: Listener): () => void {
    this.handleSub()
    const subID = this.subID++
    this.listeners.set(subID, l)

    return () => this.listeners.delete(subID)
  }

  getMsgs (user: EntityLike, from?: number, to?: number, limit?: number): _MessagesIter {
    return this.client.iterMessages(user, {
      minId: to,
      limit,
      maxId: from
    }) as _MessagesIter
  }

  async getUsers (): Promise<Api.User[]> {
    const dialogs = this.client.iterDialogs({})
    const res: Api.User[] = []

    for await (const dialog of dialogs) {
      const tDialog: Dialog = dialog
      if (tDialog.isUser && tDialog.entity?.className === 'User' && tDialog.entity.bot === false) {
        res.push(tDialog.entity)
      }
    }

    return res
  }

  async getUser (value: string): Promise<Api.User | undefined> {
    try {
      const res = await this.client.getEntity(value)
      if (res.className === 'User' && res.bot === false) {
        return res
      }
    } catch (e) {
      console.log(e)
    }
  }

  async sendMsg (
    to: string,
    message: string,
    formattingEntities: Api.TypeMessageEntity[] = [],
    file?: Buffer
  ): Promise<Api.Message> {
    return await this.client.sendMessage(to, {
      message,
      formattingEntities,
      file
    })
  }

  // That means we want to write message to user by phone number
  // when he is no in our contact list. That would lead an error.
  async isContactImportRequired (to: string): Promise<boolean> {
    if (!to.startsWith('+')) {
      return false
    }

    const res = await this.client.invoke(
      new Api.contacts.GetContacts({
        hash: bigInt(0)
      })
    )

    if (res.className === 'contacts.Contacts') {
      const actualNumber = to.slice(1)
      return !res.users.filter((x): x is Api.User => x.className === 'User').some((x) => x.phone === actualNumber)
    }

    return true
  }

  async addContact (contact: { phone: string, firstName: string, lastName: string }): Promise<void> {
    const result = await this.client.invoke(
      new Api.contacts.ImportContacts({
        contacts: [
          new Api.InputPhoneContact({
            ...contact,
            clientId: bigInt(0)
          })
        ]
      })
    )

    if (result.imported.length < 1) {
      throw Error('Failed to add contact')
    }
  }

  getToken (): string | undefined {
    // TODO: Need recheck
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    return (this.client.session.save() as never as string) ?? undefined
  }
}

export type TelegramConnectionInterface = InstanceType<typeof TelegramConnection>

// Notice: not really elegant solution, for now have no better idea
// how to reorganize this mess. This helper works like buffer for connections
// that are not yet signed in and unified telegram connection creator.
export const telegram = new (class TelegramHelper {
  readonly conns = new Map<string, TelegramConnection>()
  readonly ttls = new Map<string, NodeJS.Timeout>()

  async auth (phone: string): Promise<SignInState> {
    const conn = await this.getOrCreate(phone)

    if (!this.ttls.has(phone)) {
      this.ttls.set(
        phone,
        setTimeout(() => {
          this.conns.delete(phone)
          void conn.close()
        }, config.TelegramAuthTTL)
      )
    }

    if (conn.signInFlow !== undefined) {
      return conn.signInFlow.state
    }

    try {
      await conn.signIn()
    } catch (err) {
      this.forgetConnection(phone)
      await conn.close()

      throw err
    }

    return 'code'
  }

  async authCode (phone: string, code: string): Promise<boolean> {
    const conn = this.conns.get(phone)

    if (conn?.signInFlow === undefined) {
      throw Error('Sign in is not initialized')
    }

    return await conn.signInFlow.code(code)
  }

  async authPass (phone: string, pass: string): Promise<void> {
    const conn = this.conns.get(phone)

    if (conn?.signInFlow === undefined) {
      throw Error('Sign in is not initialized')
    }

    await conn.signInFlow.pass(pass)
  }

  async getOrCreate (phone: string): Promise<TelegramConnection> {
    const existingConn = this.conns.get(phone)

    if (existingConn !== undefined) {
      return existingConn
    }

    const conn = await this.create(phone)
    this.conns.set(phone, conn)

    return conn
  }

  getConnection (phone: string): TelegramConnection | undefined {
    return this.conns.get(phone)
  }

  forgetConnection (phone: string): void {
    this.conns.delete(phone)
    const timeout = this.ttls.get(phone)

    if (timeout !== undefined) {
      this.ttls.delete(phone)
      clearTimeout(timeout)
    }
  }

  async create (phone: string, token?: string): Promise<TelegramConnection> {
    const session = new StringSession(token)
    const client = new TelegramClient(session, config.TelegramApiID, config.TelegramApiHash, {
      connectionRetries: 5,
      autoReconnect: true
    })

    await client.connect()

    return new TelegramConnection(client, phone)
  }
})()
