// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.

// Package queue provides access to kafka queue
package queue

import (
	"context"
	"encoding/json"
	"time"

	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

// TopicTranscodeRequest is the name of the transcode requests topic.
const TopicTranscodeRequest = "stream.transcode.request"

// TopicTranscodeResult is the name of the transcode results topic.
const TopicTranscodeResult = "stream.transcode.result"

// TranscodeRequest represents transcode request.
type TranscodeRequest struct {
	BlobID        string
	WorkspaceUUID string
	ContentType   string
}

// TranscodeResult represents transcode result.
type TranscodeResult struct {
	BlobID        string
	WorkspaceUUID string
	Playlist      string
	Thumbnail     string
}

// ConsumerOptions represents options for the consumer
type ConsumerOptions struct {
	Topic  string
	Group  string
	Config Config
}

// Consumer provides a consumer interface to a Kafka queue
type Consumer interface {
	Read(ctx context.Context) (kafka.Message, error)
	Fetch(ctx context.Context) (kafka.Message, error)
	Commit(ctx context.Context, msg kafka.Message) error
	Close() error
}

// ProducerOptions represents options for the producer
type ProducerOptions struct {
	Topic      string
	Group      string
	Config     Config
	RetryCount int
}

// Producer provides a producer interface to a Kafka queue
type Producer interface {
	Send(ctx context.Context, workspaceID string, data any) error
	Close() error
}

// TConsumer implements Consumer interface
type TConsumer struct {
	topic   string
	reader  *kafka.Reader
	options ConsumerOptions
}

// TProducer implements Producer interface
type TProducer struct {
	topic   string
	writer  *kafka.Writer
	options ProducerOptions
}

// Logger is kafka.Logger implementation
type Logger struct {
	logger *zap.Logger
}

var _ Producer = (*TProducer)(nil)
var _ Consumer = (*TConsumer)(nil)
var _ kafka.Logger = (*Logger)(nil)

// NewLogger creates new kafka.Logger
func NewLogger(ctx context.Context) kafka.Logger {
	return &Logger{
		logger: log.FromContext(ctx),
	}
}

// Printf logs a message
func (l *Logger) Printf(msg string, args ...any) {
	l.logger.Sugar().Debugf(msg, args...)
}

// NewConsumer creates a new transcoding request consumer
func NewConsumer(ctx context.Context, options ConsumerOptions) Consumer {
	platformTopic := makeTopicID(options.Topic, options.Config)
	groupID := makeGroupID(options.Group, options.Topic, options.Config)

	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:           options.Config.Brokers,
		GroupID:           groupID,
		Topic:             platformTopic,
		Logger:            NewLogger(ctx),
		HeartbeatInterval: 1 * time.Second,
		SessionTimeout:    10 * time.Second,
	})

	return &TConsumer{
		options: options,
		topic:   platformTopic,
		reader:  reader,
	}
}

// Read reads (fetch and commit) a queue message.
func (c *TConsumer) Read(ctx context.Context) (kafka.Message, error) {
	return c.reader.ReadMessage(ctx)
}

// Fetch fetches a queue message.
func (c *TConsumer) Fetch(ctx context.Context) (kafka.Message, error) {
	return c.reader.FetchMessage(ctx)
}

// Commit commits the queue message.
func (c *TConsumer) Commit(ctx context.Context, msg kafka.Message) error {
	return c.reader.CommitMessages(ctx, msg)
}

// Close closes the consumer.
func (c *TConsumer) Close() error {
	return c.reader.Close()
}

// NewProducer creates a new transcoding result producer
func NewProducer(ctx context.Context, options ProducerOptions) Producer {
	platformTopic := makeTopicID(options.Topic, options.Config)
	writer := &kafka.Writer{
		Addr:                   kafka.TCP(options.Config.Brokers...),
		Topic:                  platformTopic,
		AllowAutoTopicCreation: true,
		Logger:                 NewLogger(ctx),
	}
	return &TProducer{
		options: options,
		topic:   platformTopic,
		writer:  writer,
	}
}

// Send sends a message to the queue topic
func (p *TProducer) Send(ctx context.Context, workspaceID string, data any) error {
	value, err := json.Marshal(data)
	if err != nil {
		return err
	}

	for range p.options.RetryCount {
		err = p.writer.WriteMessages(
			ctx,
			kafka.Message{
				Key:   []byte(workspaceID),
				Value: value,
			},
		)
		if err == nil {
			break
		}
	}

	return err
}

// Close closes the producer.
func (p *TProducer) Close() error {
	return p.writer.Close()
}

func makeGroupID(groupID, topic string, config Config) string {
	return makeTopicID(topic, config) + "-" + groupID
}

func makeTopicID(topic string, config Config) string {
	if config.Region != "" {
		return config.Region + "." + topic + config.Postfix
	}
	return topic + config.Postfix
}
