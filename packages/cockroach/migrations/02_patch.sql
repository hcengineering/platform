CREATE TABLE IF NOT EXISTS patch
(
    id         INT8         NOT NULL DEFAULT unique_rowid(),
    message_id UUID         NOT NULL,
    content    TEXT         NOT NULL,
    creator    VARCHAR(255) NOT NULL,
    created    TIMESTAMPTZ  NOT NULL,

    PRIMARY KEY (id),
    FOREIGN KEY (message_id) REFERENCES message (id) ON DELETE CASCADE
);

CREATE INDEX idx_patch_message_id ON patch (message_id);