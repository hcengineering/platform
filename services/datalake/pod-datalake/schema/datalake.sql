
CREATE SCHEMA IF NOT EXISTS blob;

-- B L O B

CREATE TYPE IF NOT EXISTS blob.location AS ENUM ('eu', 'weur', 'eeur', 'wnam', 'enam', 'apac');

\echo "Creating blob.data..."
CREATE TABLE IF NOT EXISTS blob.data (
  hash UUID NOT NULL,
  location blob.location NOT NULL,
  size INT8 NOT NULL,
  filename STRING(255) NOT NULL,
  type STRING(255) NOT NULL,
  CONSTRAINT pk_data PRIMARY KEY (hash, location)
);

\echo "Creating blob.blob..."
CREATE TABLE IF NOT EXISTS blob.blob (
  workspace STRING(255) NOT NULL,
  name STRING(255) NOT NULL,
  hash UUID NOT NULL,
  location blob.location NOT NULL,
  parent STRING(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP DEFAULT NULL,
  CONSTRAINT pk_blob PRIMARY KEY (workspace, name),
  CONSTRAINT fk_data FOREIGN KEY (hash, location) REFERENCES blob.data (hash, location),
  CONSTRAINT fk_parent FOREIGN KEY (workspace, parent)  REFERENCES blob.blob (workspace, name) ON DELETE CASCADE
);

\echo "Creating blob.meta..."
CREATE TABLE IF NOT EXISTS blob.meta (
  workspace STRING(255) NOT NULL,
  name STRING(255) NOT NULL,
  meta JSONB NOT NULL,
  CONSTRAINT pk_meta PRIMARY KEY (workspace, name),
  CONSTRAINT fk_blob FOREIGN KEY (workspace, name) REFERENCES blob.blob (workspace, name)
);
