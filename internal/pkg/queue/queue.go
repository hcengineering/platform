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

const TopicTranscodeRequest = "stream.transcode.request"
const TopicTranscodeResult = "stream.transcode.result"

type TranscodeRequest struct {
	BlobID        string
	WorkspaceUUID string
	ContentType   string
}

type TranscodeResult struct {
	BlobID        string
	WorkspaceUUID string
}

type Consumer interface {
	//	Heartbeat(ctx context.Context) error
	Read(ctx context.Context) (kafka.Message, error)
	Fetch(ctx context.Context) (kafka.Message, error)
	Commit(ctx context.Context, msg kafka.Message) error
	Close() error
}

type Producer interface {
	Send(ctx context.Context, workspaceID string, data any) error
	Close() error
}

type TConsumer struct {
	topic  string
	reader *kafka.Reader
}

type TProducer struct {
	topic  string
	writer *kafka.Writer
}

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

func (l *Logger) Printf(msg string, args ...any) {
	l.logger.Sugar().Debugf(msg, args...)
}

// NewConsumer creates a new transcoding request consumer
func NewConsumer(ctx context.Context, topic, group string, config Config) Consumer {
	platformTopic := makeTopicID(topic, config)
	groupID := makeGroupID(group, topic, config)

	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:           config.Brokers,
		GroupID:           groupID,
		Topic:             platformTopic,
		Logger:            NewLogger(ctx),
		HeartbeatInterval: 1 * time.Second,
		SessionTimeout:    10 * time.Second,
	})

	return &TConsumer{
		topic:  platformTopic,
		reader: reader,
	}
}

func (c *TConsumer) Read(ctx context.Context) (kafka.Message, error) {
	return c.reader.ReadMessage(ctx)
}

func (c *TConsumer) Fetch(ctx context.Context) (kafka.Message, error) {
	return c.reader.FetchMessage(ctx)
}

func (c *TConsumer) Commit(ctx context.Context, msg kafka.Message) error {
	return c.reader.CommitMessages(ctx, msg)
}

func (c *TConsumer) Close() error {
	return c.reader.Close()
}

// NewProducer creates a new transcoding result producer
func NewProducer(ctx context.Context, topic string, config Config) Producer {
	platformTopic := makeTopicID(topic, config)
	writer := &kafka.Writer{
		Addr:                   kafka.TCP(config.Brokers...),
		Topic:                  platformTopic,
		AllowAutoTopicCreation: true,
		Logger:                 NewLogger(ctx),
	}
	return &TProducer{
		topic:  platformTopic,
		writer: writer,
	}
}

func (p *TProducer) Send(ctx context.Context, workspaceID string, data any) error {
	value, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return p.writer.WriteMessages(
		ctx,
		kafka.Message{
			Key:   []byte(workspaceID),
			Value: value,
		},
	)
}

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
