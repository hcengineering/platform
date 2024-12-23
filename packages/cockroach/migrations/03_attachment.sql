CREATE TABLE IF NOT EXISTS attachment
(
    message_id UUID         NOT NULL,
    card_id    UUID         NOT NULL,
    creator    VARCHAR(255) NOT NULL,
    created    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    PRIMARY KEY (message_id, card_id),
    FOREIGN KEY (message_id) REFERENCES message (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS attachment_message_idx ON attachment (message_id);
