
CREATE SCHEMA IF NOT EXISTS blob;

DROP TABLE IF EXISTS blob.blob;
DROP TABLE IF EXISTS blob.data;
DROP TYPE IF EXISTS blob.content_type;
DROP TYPE IF EXISTS blob.location;

-- B L O B

CREATE TYPE blob.content_type AS ENUM ('application','audio','font','image','model','text','video');
CREATE TYPE blob.location AS ENUM ('kv', 'weur', 'eeur', 'wnam', 'enam', 'apac');

\echo "Creating blob.data..."
CREATE TABLE blob.data (
  hash UUID NOT NULL,
  location blob.location NOT NULL,
  size INT8 NOT NULL,
  filename UUID NOT NULL,
  type blob.content_type NOT NULL,
  subtype STRING(64) NOT NULL,
  CONSTRAINT pk_data PRIMARY KEY (hash, location)
);

\echo "Creating blob.blob..."
CREATE TABLE blob.blob (
  workspace STRING(255) NOT NULL,
  name STRING(255) NOT NULL,
  hash UUID NOT NULL,
  location blob.location NOT NULL,
  deleted BOOL NOT NULL,
  CONSTRAINT pk_blob PRIMARY KEY (workspace, name),
  CONSTRAINT fk_data FOREIGN KEY (hash, location) REFERENCES blob.data (hash, location)
);
