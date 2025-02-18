CREATE TABLE IF NOT EXISTS communication.notifications
(
    message_id UUID NOT NULL,
    context    UUID NOT NULL,

    PRIMARY KEY (message_id, context),
    FOREIGN KEY (context) REFERENCES communication.notification_context (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS notification_context_idx ON communication.notifications (context);