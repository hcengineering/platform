CREATE TABLE IF NOT EXISTS communication.thread
(
    workspace_id  UUID         NOT NULL,
    card_id       VARCHAR(255) NOT NULL,
    message_id    INT8         NOT NULL,
    thread_id     VARCHAR(255) NOT NULL,
    replies_count INT          NOT NULL,
    last_reply    TIMESTAMPTZ  NOT NULL,

    PRIMARY KEY (workspace_id, thread_id),
    UNIQUE (workspace_id, card_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_workspace_card_message ON communication.thread (workspace_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_workspace_card_message ON communication.thread (workspace_id, card_id, message_id);