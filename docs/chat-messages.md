# Chat messages and reading state

The model separates message streams, personal reading positions and notifications.
Fetching messages, viewing notifications and advancing a reading position are distinct operations.

## Chats, discussions and threads

A **chat** is a stream shared by participants. It can be a channel, a personal/group direct,
or a discussion attached to a document.

| Entity | Identity and ownership |
| --- | --- |
| Channel | A named chat with its own participants and visibility |
| Direct | A personal or group chat among its participants |
| Discussion | A chat with its own identity, attached to an owner document |
| Root message | A message in the main stream of a chat |
| Thread | A branch of replies under a root message, identified by that root |
| Reply | A message belonging to a thread rather than the main stream |

A discussion's owner describes its location. An optional subject identifies a more specific
document, such as an attachment. Neither reference replaces the discussion's own identity.
Messages posted directly to an owner document are a separate stream from its discussions.

A root message belongs to the main chat stream and can have replies in a thread.
Reading the main stream does not include those replies. Each thread has an independent
reading position; reading a chat does not recursively read its threads.

A followed thread is a branch an account follows for further replies.
Following and permission to access a thread are separate relationships.

## Personal reading context

A **reading context** belongs to one account and one stream: either a chat's main stream
or a thread. It records:

| Property | Meaning |
| --- | --- |
| Account | Owner of this personal state |
| Stream | Chat, or root message identifying a thread |
| Last activity time | Activity timestamp recorded for the stream |
| Reading position | Timestamp through which the account has read |
| Hidden and pinned state | Personal navigation preferences, independent of reading state |

A missing context and an existing context without a reading position are different states:

- A missing context has no established personal reading boundary.
- An existing context without a reading position represents a stream that has never been read.

An account can have multiple social identities. They all belong to the same reader.
Its own messages are excluded when selecting unread history.

Activity by the account itself does not necessarily make a previously read stream unread.
A sender's new context can start read through its sending activity; an already read context
can advance its activity time and reading position together for its own activity.

## Notifications

A **notification** is a personal notice about activity, such as a new message, mention or reaction.
It belongs to a reading context and refers to the activity or message that caused it.

A notification has independent viewed and archived states.
Archiving controls notification visibility; it is a separate concept from advancing the
stream's reading position. A notification's creation time can be later than the message's creation time.

There is no universal per-message read flag. These questions have different answers:

| Question | Relevant state |
| --- | --- |
| Does a chat have an unread marker? | Last activity time compared with its reading position |
| Are there unread reply notifications for a thread? | Active, unviewed notifications about replies |
| Which messages belong to unread history? | An exclusive timestamp boundary and message timestamps |
| Has a particular notification been viewed? | That notification's viewed state |

An unread marker, a notification count and the number of messages in an unread history range
need not be equal. Grouping notifications can also change a displayed count.

## Unread chats and threads

A chat has an unread marker when its last activity time is later than its reading position.
Missing timestamps are treated as zero for this comparison.
An unviewed notification alone does not establish that marker.

A followed thread has unread reply notifications when at least one active, unviewed
activity notification refers to a reply under its root. Multiple reply notifications can
refer to the same thread. Mentions and context timestamps alone do not establish this
particular reply-notification state.

A thread can therefore have unread replies while its containing chat's main stream is read,
and the main stream can be unread while all its threads are read.

## Unread history

Unread history is a range of messages, not a set of individual read receipts.
Selecting that range does not change the reading context or notification states.

The range is determined for one account and one stream:

1. Without a reading context, no personal unread boundary is established.
   Ordinary history remains separate from unread-history selection.
2. An existing context that has never been read has a boundary of zero.
3. Otherwise, the reading position is the initial boundary.
4. An older unviewed activity or mention notification can reopen an earlier range.
   Resolve its referenced message in this stream and move the boundary just before the
   earliest such message, if that is earlier than the current boundary.
5. Include messages created strictly after the boundary, excluding all social identities
   of the account itself.

Deleted references and references to another stream do not move this stream's boundary.
Messages already viewed can appear inside a reopened range; the boundary is not a receipt
for each returned message.

Timestamps are Unix milliseconds. To include a message created at time T with an exclusive
boundary, the boundary must be earlier than T, for example T - 1.

A notification timestamp must not substitute for a message timestamp. If a message is created
at 1000 and its notification at 1058, selecting messages after 1058 would lose the message.
For a never-read context, a zero boundary includes it. When reopening an earlier range, a
boundary of 999 includes it.

Messages with equal creation times remain distinct messages. Traversing history must preserve
their identities rather than treating a timestamp as a unique message position.

## Reading-state transitions

| Operation | Notification effect | Reading-position effect |
| --- | --- | --- |
| Fetch history or discover streams | None | None |
| Read through selected messages | Related activity, mention and reaction notifications become viewed | Advances through the selected messages |
| Mark a whole stream read | Its unviewed notifications become viewed | Advances to the time of the action |
| Mark notifications unread | Selected viewed notifications become unviewed | Can rewind before a referenced activity message |

Advancing a reading position must not move it backwards.
Marking a whole stream read concerns that stream alone, including messages beyond a previously
fetched page. A chat and each thread are marked separately.

Reading messages and updating related notification states form one logical operation.
Notifications can arrive after the messages have been read, so late arrivals may need to
be reconciled with those already read messages.

Marking a stream read without an existing context does not itself establish a reading context
or follow the stream. Establishing that relationship is a separate operation.
A read action can update the reading position without viewing any notifications, for example
in a stream containing only the account's own messages.

Marking notifications unread requires existing notifications to restore.
Rewinding the reading position requires an identifiable activity message; it must not invent
a timestamp or an individual message receipt.

## Examples

| Scenario | Expected interpretation |
| --- | --- |
| First incoming message; its notification arrives later | Unread history includes the message |
| Context exists but has never been read; no notification yet | Unread history begins at zero |
| No personal context exists | No personal unread boundary has been established |
| Older notification remains unviewed after a later read | The unread-history range can reopen before that message |
| Notification refers to a deleted message or another stream | It does not rewind this stream |
| Account has multiple social identities | All its own messages are excluded from unread history |
| Read or mark a thread, then inspect its chat | The main stream's reading state is independent |
| Fetch one page, then mark the whole stream read | The action is not limited to that page |
| Fetch history without a read action | Reading positions and notification flags are unchanged |
