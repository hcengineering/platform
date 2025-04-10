//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import postgres from 'postgres'
import { AccountUuid, Ref, WorkspaceUuid } from '@hcengineering/core'
import { ActivityMessage } from '@hcengineering/activity'

import config from './config'
import { ChannelId, ChannelRecord, MessageRecord, OtpRecord, ReplyRecord } from './types'

export async function getDb (): Promise<PostgresDB> {
  const sql = postgres(config.DbUrl, {
    connection: {
      application_name: config.ServiceId
    },
    fetch_types: true,
    prepare: true
  })

  return await PostgresDB.create(sql)
}

const otpTable = 'telegram_bot.otp'
const messagesTable = 'telegram_bot.messages'
const channelsTable = 'telegram_bot.channels'
const repliesTable = 'telegram_bot.replies'

export class PostgresDB {
  constructor (private readonly client: postgres.Sql) {}

  static async create (client: postgres.Sql): Promise<PostgresDB> {
    await this.init(client)
    return new PostgresDB(client)
  }

  static async init (client: postgres.Sql): Promise<void> {
    const sql = `
        CREATE SCHEMA IF NOT EXISTS telegram_bot;
        
        CREATE TABLE IF NOT EXISTS ${otpTable} (
          telegram_id INT8 NOT NULL,
          telegram_username TEXT NOT NULL,
          code VARCHAR(255) NOT NULL,
          expires TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (code)
        );
        
        CREATE TABLE IF NOT EXISTS ${messagesTable} (
          message_id VARCHAR(255) NOT NULL,
          workspace UUID NOT NULL,
          account UUID NOT NULL,
          telegram_message_id INT8 NOT NULL,
          PRIMARY KEY (workspace, account, message_id)
        );

        CREATE TABLE IF NOT EXISTS ${channelsTable} (
          rowid INT8 NOT NULL DEFAULT unique_rowid(),
          workspace UUID NOT NULL,
          _id VARCHAR(255) NOT NULL,
          _class VARCHAR(255) NOT NULL,
          name TEXT NOT NULL,
          account UUID NOT NULL,
          PRIMARY KEY (rowid),
          UNIQUE (workspace, _id, account)
        );

        CREATE TABLE IF NOT EXISTS ${repliesTable} (
          message_id VARCHAR(255) NOT NULL,
          telegram_user_id INT8 NOT NULL,
          reply_id INT8 NOT NULL,
          PRIMARY KEY (message_id, telegram_user_id, reply_id)
        );
  `

    await client.unsafe(sql)
  }

  async insertOtp (otp: OtpRecord): Promise<void> {
    const sql = `
      INSERT INTO ${otpTable} (telegram_id, telegram_username, code, expires)
      VALUES ($1::int8, $2::text, $3::text, $4::timestamptz)`
    await this.client.unsafe(sql, [otp.telegramId, otp.telegramUsername ?? null, otp.code, otp.expires])
  }

  async getOtpByCode (code: string): Promise<OtpRecord | undefined> {
    const sql = `
      SELECT * FROM ${otpTable} WHERE code = $1::text LIMIT 1`
    const res = await this.client.unsafe(sql, [code])
    return res.map(toOtpRecord)[0]
  }

  async getOtpByTelegramId (telegramId: number): Promise<OtpRecord | undefined> {
    const sql = `
      SELECT * FROM ${otpTable} WHERE telegram_id = $1::int8 ORDER BY created_at DESC LIMIT 1`
    const res = await this.client.unsafe(sql, [telegramId])
    return res.map(toOtpRecord)[0]
  }

  async removeOtp (code: string): Promise<void> {
    const sql = `DELETE FROM ${otpTable} WHERE code = $1::text`
    await this.client.unsafe(sql, [code])
  }

  async removeExpiredOtp (): Promise<void> {
    const sql = `DELETE FROM ${otpTable} WHERE expires < NOW();`
    await this.client.unsafe(sql)
  }

  async getChannels (account: AccountUuid, workspace: WorkspaceUuid): Promise<ChannelRecord[]> {
    const sql = `
      SELECT * FROM ${channelsTable} WHERE account = $1::uuid AND workspace = $2::uuid ORDER BY name ASC`
    const res = await this.client.unsafe(sql, [account, workspace])
    return res.map(toChannelRecord)
  }

  async getChannel (account: AccountUuid, channelId: ChannelId): Promise<ChannelRecord | undefined> {
    const sql = `
      SELECT * FROM ${channelsTable} WHERE account = $1::uuid AND _id = $2::varchar`
    const res = await this.client.unsafe(sql, [account, channelId])
    return res.map(toChannelRecord)[0]
  }

  async insertChannel (records: Omit<ChannelRecord, 'rowId'>): Promise<void> {
    const sql = `
      INSERT INTO ${channelsTable} (
        workspace, account, _id, _class, name
      )
      VALUES ($1::uuid, $2::uuid, $3::varchar, $4::varchar, $5::text)`
    await this.client.unsafe(sql, [records.workspace, records.account, records._id, records._class, records.name])
  }

  async removeChannels (ids: ChannelId[]): Promise<void> {
    const sql = `DELETE FROM ${channelsTable} WHERE rowid = ANY($1::int8[])`
    await this.client.unsafe(sql, [ids])
  }

  async updateChannelName (id: ChannelId, name: string): Promise<void> {
    const sql = `UPDATE ${channelsTable} SET name = $2::text WHERE rowid = $1::int8`
    await this.client.unsafe(sql, [id, name])
  }

  async insertMessage (record: MessageRecord): Promise<void> {
    const sql = `
      INSERT INTO ${messagesTable} (
        message_id, workspace, account, telegram_message_id
      )
      VALUES ($1::varchar, $2::uuid, $3::uuid, $4::int8)
      ON CONFLICT DO NOTHING`
    await this.client.unsafe(sql, [record.messageId, record.workspace, record.account, record.telegramMessageId])
  }

  async getMessageByRef (account: AccountUuid, messageId: Ref<ActivityMessage>): Promise<MessageRecord | undefined> {
    const sql = `
      SELECT * FROM ${messagesTable} WHERE account = $1::uuid AND message_id = $2::varchar LIMIT 1`
    const res = await this.client.unsafe(sql, [account, messageId])
    return res.map(toMessageRecord)[0]
  }

  async getMessageByTgId (account: AccountUuid, telegramId: number): Promise<MessageRecord | undefined> {
    const sql = `
      SELECT * FROM ${messagesTable} WHERE telegram_message_id = $1::int8 AND account = $2::uuid LIMIT 1`
    const res = await this.client.unsafe(sql, [telegramId, account])
    return res.map(toMessageRecord)[0]
  }

  async insertReply (record: ReplyRecord): Promise<void> {
    const sql = `
      INSERT INTO ${repliesTable} (
        message_id, telegram_user_id, reply_id
      )
      VALUES ($1::varchar, $2::int8, $3::int8)`
    await this.client.unsafe(sql, [record.messageId, record.telegramUserId, record.replyId])
  }

  async getReply (tgUserId: number, replyTo: number): Promise<ReplyRecord | undefined> {
    const sql = `
      SELECT * FROM ${repliesTable} WHERE telegram_user_id = $1::int8 AND reply_id = $2::int8 LIMIT 1`
    const res = await this.client.unsafe(sql, [tgUserId, replyTo])
    return res.map(toReplyRecord)[0]
  }

  async close (): Promise<void> {
    await this.client.end({ timeout: 0 })
  }
}

function toOtpRecord (raw: any): OtpRecord {
  return {
    telegramId: Number(raw.telegram_id),
    telegramUsername: raw.telegram_username,
    code: raw.code,
    expires: new Date(raw.expires),
    createdAt: new Date(raw.created_at)
  }
}

function toChannelRecord (raw: any): ChannelRecord {
  return {
    rowId: String(raw.rowid) as ChannelId,
    workspace: raw.workspace,
    _id: raw._id,
    _class: raw._class,
    name: raw.name,
    account: raw.account
  }
}

function toReplyRecord (raw: any): ReplyRecord {
  return {
    messageId: raw.message_id,
    telegramUserId: Number(raw.telegram_user_id),
    replyId: Number(raw.reply_id)
  }
}

function toMessageRecord (raw: any): MessageRecord {
  return {
    messageId: raw.message_id,
    workspace: raw.workspace,
    account: raw.account,
    telegramMessageId: Number(raw.telegram_message_id)
  }
}
