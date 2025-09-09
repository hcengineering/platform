# Huly Virtual Network

A distributed, scalable virtual network architecture for the Huly that enables fault-tolerant performance communication. [Huly Network](http://github.com/hcengineering/huly.net)

## Building Huly on top of Huly Network

Huly could be managed by following set of container kinds, `session`, `query`, `transactor`.

- session -> a map/reduce/find executor for queries and transactions from client.
- query -> a DB query engine, execute `find` requests from session and pass them to DB, allow to search for all data per region. Should have access to tables of account -> workspace mapping for security.
- transactor -> modification archestrator for all edit operations, do them one by one.

```mermaid
flowchart
  Endpoint -.->|
  connect
  session/user1
              |HulyNetwork[Huly Network]

  Endpoint <-->|find,tx| parsonal-ws:user1

  parsonal-ws:user1 -..->|get-workspace info| DatalakeDB

  parsonal-ws:user1 -..->|find| query:europe

  parsonal-ws:user1 -..->|event's| Endpoint

  query:europe -..->|resp| parsonal-ws:user1

  parsonal-ws:user1 -..->|response chunks| Endpoint

  parsonal-ws:user1 -..->|tx| transactor:ws1

  transactor:ws1 -..->|event's| HulyPulse
  transactor:ws1 -..->|event's| parsonal-ws:user1

  HulyPulse <--> Client

  Client <--> Endpoint

  query:europe -..->|"update"| QueryDB
  transactor:ws1 -..->|update| DatalakeDB

  transactor:ws1 -..->|txes| Kafka[Output Queue]

  Kafka -..-> Indexer[Structure +
  Fulltext Index]

  Indexer -..-> QueryDB

  Indexer -..->|indexed tx| HulyPulse

  Indexer -..->|indexed tx| parsonal-ws:user1

  Kafka -..-> AsyncTriggers

  AsyncTriggers -..->|find| query:europe

  AsyncTriggers -..->|derived txes| transactor:ws1

  InputQueue -->|txes| transactor:ws1

  Services[Services
  Github/Telegram/Translate] -..-> InputQueue

  Kafka -..-> Services

  Services -..-> query:europe

  QueryDB@{shape: database}
  InputQueue@{shape: database}
  DatalakeDB@{shape: database}
  Kafka@{shape: database}
  parsonal-ws:user1@{ shape: h-cyl}

```
