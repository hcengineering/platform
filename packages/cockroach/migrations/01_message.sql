DROP TABLE IF EXISTS c_message CASCADE;
DROP TABLE IF EXISTS c_messages_group CASCADE;

CREATE TABLE IF NOT EXISTS c_message
(
    id           UUID         NOT NULL DEFAULT gen_random_uuid(),
    workspace_id UUID         NOT NULL,
    card_id      VARCHAR(255) NOT NULL,

    content      TEXT         NOT NULL,
    creator      VARCHAR(255) NOT NULL,
    created      TIMESTAMPTZ  NOT NULL,

    PRIMARY KEY (id)
);


CREATE TABLE IF NOT EXISTS c_messages_group
(
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID         NOT NULL,
    card_id      VARCHAR(255) NOT NULL,
    start_at     TIMESTAMPTZ  NOT NULL,
    end_at       TIMESTAMPTZ  NOT NULL,
    blob_id      UUID         NOT NULL,
    count        INT          NOT NULL,

    UNIQUE (workspace_id, card_id, blob_id)
);
