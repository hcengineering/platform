CREATE TABLE IF NOT EXISTS attachment
(
    message_id INT8         NOT NULL,
    card_id    UUID         NOT NULL,
    creator    VARCHAR(255) NOT NULL,
    created    TIMESTAMP DEFAULT now(),

    PRIMARY KEY (message_id, card_id)
);

CREATE INDEX IF NOT EXISTS attachment_message_idx ON attachment (message_id);