DROP TABLE IF EXISTS c_attachment CASCADE;
CREATE TABLE IF NOT EXISTS c_attachment
(
    message_id UUID         NOT NULL,
    card_id    VARCHAR(255) NOT NULL,
    creator    VARCHAR(255) NOT NULL,
    created    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    PRIMARY KEY (message_id, card_id),
    FOREIGN KEY (message_id) REFERENCES c_message (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS attachment_message_idx ON c_attachment (message_id);
