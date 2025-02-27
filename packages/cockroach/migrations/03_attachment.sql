CREATE TABLE IF NOT EXISTS communication.attachments
(
    message_id INT8         NOT NULL,
    card_id    VARCHAR(255) NOT NULL,
    creator    VARCHAR(255) NOT NULL,
    created    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    PRIMARY KEY (card_id, message_id)
);

CREATE INDEX IF NOT EXISTS attachment_message_idx ON communication.attachments (message_id);
