CREATE TABLE IF NOT EXISTS notification
(
    message_id UUID NOT NULL,
    context    UUID NOT NULL,

    PRIMARY KEY (message_id, context),
    FOREIGN KEY (message_id) REFERENCES message (id) ON DELETE CASCADE,
    FOREIGN KEY (context) REFERENCES notification_context (id) ON DELETE CASCADE
);
