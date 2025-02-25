# Huly Platform API Client

A TypeScript client library for interacting with the Huly Platform API.

## Installation

In order to be able to install required packages, you will need to obtain GitHub access token. You can create a token by following the instructions [here](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token).

```bash
npm install @hcengineering/api-client
```

## Authentication

There are two ways to connect to the platform, using email and password, or using token.

Parameters:

- `url`: URL of the Huly instance
- `options`: Connection options
  - `workspace`: Name of the workspace to connect to
  - `token`: Optional authentication token
  - `email`: Optional user email
  - `password`: Optional user password
  - `connectionTimeout`: Optional connection timeout
  - `socketFactory`: Optional socket factory

### Using Email and Password

```ts
const client = await connect('http://localhost:8087', {
  email: 'user1',
  password: '1234',
  workspace: 'ws1'
})

...

await client.close()
```

### Using Token

```ts
const client = await connect('http://localhost:8087', {
  token: '...',
  workspace: 'ws1'
})

...

await client.close()
```

## Example usage

### Fetch API

The client provides two main methods for retrieving documents: `findOne` and `findAll`.

#### findOne

Retrieves a single document matching the query criteria.

Parameters:

- `_class`: Class of the object to find, results will include all subclasses of the targe class
- `query`: Query criteria
- `options`: Find options
  - `limit`: Limit the number of results returned
  - `sort`: Sorting criteria
  - `lookup`: Lookup criteria
  - `projection`: Projection criteria
  - `total`: If specified total will be returned

Example:

```ts
import contact from '@hcengineering/contact'

...

const person = await client.findOne(
  contact.class.Person,
  {
    _id: 'person-id'
  }
)
```

#### findAll

Retrieves multiple document matching the query criteria.

Parameters:

- `_class`: Class of the object to find, results will include all subclasses of the targe class
- `query`: Query criteria
- `options`: Find options
  - `limit`: Limit the number of results returned
  - `sort`: Sorting criteria
  - `lookup`: Lookup criteria
  - `projection`: Projection criteria
  - `total`: If specified total will be returned

Example:

```ts
import { SortingOrder } from '@hcengineering/core'
import contact from '@hcengineering/contact'

..

const persons = await client.findAll(
  contact.class.Person,
  {
    city: 'New York'
  },
  {
    limit: 10,
    sort: {
      name: SortingOrder.Ascending
    }
  }
)
```

### Documents API

The client provides three main methods for managing documents: `createDoc`, `updateDoc`, and `removeDoc`. These methods allow you to perform CRUD operations on documents.

#### createDoc

Creates a new document in the specified space.

Parameters:

- `_class`: Class of the object
- `space`: Space of the object
- `attributes`: Attributes of the object
- `id`: Optional id of the object, if not provided, a new id will be generated

Example:

```ts
import contact, { AvatarType } from '@hcengineering/contact'

..

const personId = await client.createDoc(
  contact.class.Person,
  contact.space.Contacts,
  {
    name: 'Doe,John',
    city: 'New York',
    avatarType: AvatarType.COLOR
  }
)
```

#### updateDoc

Updates exising document.

Parameters:

- `_class`: Class of the object
- `space`: Space of the object
- `objectId`: Id of the object
- `operations`: Attributes of the object to update

Example:

```ts
import contact from '@hcengineering/contact'

..

await client.updateDoc(
  contact.class.Person,
  contact.space.Contacts,
  personId,
  {
    city: 'New York',
  }
)
```

#### removeDoc

Removes exising document.

Parameters:

- `_class`: Class of the object
- `space`: Space of the object
- `objectId`: Id of the object

Example:

```ts
import contact from '@hcengineering/contact'

..

await client.removeDoc(
  contact.class.Person,
  contact.space.Contacts,
  personId
)
```

### Collections API

#### addCollection

Creates a new attached document in the specified collection.

Parameters:

- `_class`: Class of the object to create
- `space`: Space of the object to create
- `attachedTo`: Id of the object to attach to
- `attachedToClass`: Class of the object to attach to
- `collection`: Name of the collection containing attached documents
- `attributes`: Attributes of the object
- `id`: Optional id of the object, if not provided, a new id will be generated

Example:

```ts
import contact, { AvatarType } from '@hcengineering/contact'

..

const personId = await client.createDoc(
  contact.class.Person,
  contact.space.Contacts,
  {
    name: 'Doe,John',
    city: 'New York',
    avatarType: AvatarType.COLOR
  }
)

await client.addCollection(
  contact.class.Channel,
  contact.space.Contacts,
  personId,
  contact.class.Person,
  'channels',
  {
    provider: contact.channelProvider.Email,
    value: 'john.doe@example.com'
  }
)
```

#### updateCollection

Updates exising attached document in collection.

Parameters:

- `_class`: Class of the object to update
- `space`: Space of the object to update
- `objectId`: Space of the object to update
- `attachedTo`: Id of the parent object
- `attachedToClass`: Class of the parent object
- `collection`: Name of the collection containing attached documents
- `attributes`: Attributes of the object to update

Example:

```ts
import contact from '@hcengineering/contact'

..

await client.updateCollection(
  contact.class.Channel,
  contact.space.Contacts,
  channelId,
  personId,
  contact.class.Person,
  'channels',
  {
    city: 'New York',
  }
)
```

#### removeCollection

Removes exising attached document from collection.

Parameters:

- `_class`: Class of the object to remove
- `space`: Space of the object to remove
- `objectId`: Space of the object to remove
- `attachedTo`: Id of the parent object
- `attachedToClass`: Class of the parent object
- `collection`: Name of the collection containing attached documents

Example:

```ts
import contact from '@hcengineering/contact'

..

await client.removeCollection(
  contact.class.Channel,
  contact.space.Contacts,
  channelId,
  personId,
  contact.class.Person,
  'channels'
)
```

### Mixins API

The client provides two methods for managing mixins: `createMixin` and `updateMixin`.

#### createMixin

Creates a new mixin for a specified document.

Parameters:

- `objectId`: Id of the object the mixin is attached to
- `objectClass`: Class of the object the mixin is attached to
- `objectSpace`: Space of the object the mixin is attached to
- `mixin`: Id of the mixin type to update
- `attributes`: Attributes of the mixin

```ts
import contact, { AvatarType } from '@hcengineering/contact'

..

const personId = await client.createDoc(
  contact.class.Person,
  contact.space.Contacts,
  {
    name: 'Doe,John',
    city: 'New York',
    avatarType: AvatarType.COLOR
  }
)

await client.createMixin(
  personId,
  contact.class.Person,
  contact.space.Contacts,
  contact.mixin.Employee,
  {
    active: true,
    position: 'CEO'
  }
)
```

#### updateMixin

Updates an existing mixin.

Parameters:

- `objectId`: Id of the object the mixin is attached to
- `objectClass`: Class of the object the mixin is attached to
- `objectSpace`: Space of the object the mixin is attached to
- `mixin`: Id of the mixin type to update
- `attributes`: Attributes of the mixin to update

```ts
import contact, { AvatarType } from '@hcengineering/contact'

..

const person = await client.findOne(
  contact.class.Person,
  {
    _id: 'person-id'
  }
)

await client.updateMixin(
  personId,
  contact.class.Person,
  contact.space.Contacts,
  contact.mixin.Employee,
  {
    active: false
  }
)
```
