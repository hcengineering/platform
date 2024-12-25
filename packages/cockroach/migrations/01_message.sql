CREATE TABLE IF NOT EXISTS message
(
    id           UUID         NOT NULL DEFAULT gen_random_uuid(),
    workspace_id UUID         NOT NULL,
    thread_id    UUID         NOT NULL,

    content      TEXT         NOT NULL,
    creator      VARCHAR(255) NOT NULL,
    created      TIMESTAMPTZ  NOT NULL,

    PRIMARY KEY (id)
);

