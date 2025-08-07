# Hulypulse

Hulypulse is a service that enables clients to share information on a “whiteboard”. Clients connected to the same “whiteboard” see data provided by other clients to the whiteboard.

The service is exposed as REST and WebSocket API.

**Usage scenarios:**

- user presence in a document
- user is “typing” event
- user cursor position in editor or drawing board
- service posts a process status

## Key
Key is a string that consists of one or multiple segments separated by some separator.
Example: foo/bar/baz.

It is possible to use wildcard keys to list or subscribe to values with this prefix.

Key may contain a special section (guard) $that separates public and private data. “Private” data is available when querying or subscribing by exact key.
Example foo/bar/$/private, this value can be queried by foo/bar/$/private or foo/bar/$/but not by foo/bar/

## Data
“Data” is an arbitrary JSON document.
Size of data is limited to some reasonable size

## API
Methods

GET - returns values of one key

LIST - returns values with given prefix until the “sentinel”

PUT - put value to the key
- Support CAS
- Support If-* headers

DELETE - delete value of the key

SUB - subscribe to key data + get initial state
Behavior identical to LIST

UNSUB - unsubscribe to key data


## HTTP API

```PUT /{workspace}/{key}```
- Input
    Body - data
    Content-Type: application/json (do we need something else?)
    Content-Length: optional
    Headers: TTL or absolute expiration time
        HULY-TTL
        HULY-EXPIRE-AT
    ** Conditional Headers If-*: **
	- `If-Match: *` — update only if the key exists
	- `If-Match: <md5>` — update only if current value's MD5 matches
	- `If-None-Match: *` — insert only if the key does not exist
- Output
    - Status:
	- `201` if inserted with `If-None-Match: *`
	- `204` on successful insert or update
	- `412` if the condition is not met
	- `400` if headers are invalid
    - No body

```PATCH /{workspace}/{key}```
- TODO (not in v1)

```DELETE /{workspace}/{key}```
- Output
    Status: 204

```GET /{workspace}/{key}```
- Output
    - Status 200
    - Content-type: application/json
    - Body:
        - workspace
	- key
        - data
        - expiresAt ?

```GET /{workspace}?prefix={key}```
- Output
    - Status 200
    - Content-type: application/json
    - Body (array):
        - workspace
        - key
        - data
        - expiresAt ?

## WebSocket API

**Client to Server**

```PUT```
    - correlation id (optional)
    - type: "put"
    - key: “foo/bar“
    - data
    - TTL / expiresAt

```DELETE```
    - correlation id (optional)
    - type: "delete"
    - key: “foo/bar“

```SUB```
    type: "sub"
    key: “foo/bar“

```UNSUB```
    - type: "unsub"
    - key: “foo/bar“

**Server to Client**

```PUT```
    - correlation id (optional)
    - type: "put"
    - ?? TODO: user? workspace: "11111111-2222-3333-4444-555555555555"
    - key: “foo/bar“
    - data
    - expiresAt

```DELETE```
    - correlation id (optional)
    - type: "delete"
    - key: “foo/bar“


## Running

Pre-build docker images is available at: hardcoreeng/service_hulypulse:{tag}.

You can use the following command to run the image locally:
```bash
docker run -p 8095:8095 -it --rm hardcoreeng/service_hulypulse:{tag}"
```

If you want to run the service as a part of local huly development environment use the following command:
```bash
 export HULY_REDIS_URLS="redis://huly.local:6379"
 docker run --rm -it --network dev_default -p 8095:8095 hardcoreeng/service_hulypulse:{tag}
```
This will run Hulypulse in the same network as the rest of huly services, and set the redis connection string to the one matching the local dev redis instance.

You can then access hulypulse at http://localhost:8095.


## Authetication
Hulypulse uses bearer JWT token authetication. At the moment, it will accept any token signed by the hulypulse secret. The secret is set in the environment variable HULY_TOKEN_SECRET variable. 

## Configuration
The following environment variables are used to configure hulypulse:
   - ```HULY_BIND_HOST```: host to bind the server to (default: 0.0.0.0)
   - ```HULY_BIND_PORT```: port to bind the server to (default: 8094)
   - ```HULY_PAYLOAD_SIZE_LIMIT```: maximum size of the payload (default: 2Mb)
   - ```HULY_TOKEN_SECRET```: secret used to sign JWT tokens (default: secret)
   - ```HULY_REDIS_URLS```: redis connection string (default: redis://huly.local:6379)
   - ```HULY_REDIS_PASSWORD```: redis password (default: "&lt;invalid&gt;")
   - ```HULY_REDIS_MODE```: redis mode "direct" or "sentinel" (default: "direct")
   - ```HULY_REDIS_SERVICE```: redis service (default: "mymaster")
   - ```HULY_MAX_TTL```: maximum storage time (default: 3600)

## Todo (in no particular order)
- [ ] Optional value encryption
- [ ] HEAD request
- [ ] Conditional update (optimistic locking)
- [ ] Support for open telemetry
- [ ] Concurrency control for database migration (several instances of hulypulse are updated at the same time)
- [ ] TLS support
- [ ] Namespacee based access control
- [ ] Liveness/readiness probe endpoint

## Contributing
Contributions are welcome! Please open an issue or a pull request if you have any suggestions or improvements.

## License
This project is licensed under EPL-2.0
