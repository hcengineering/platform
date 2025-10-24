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

// Package tracing provides utilities for OpenTelemetry tracing.
package tracing

import (
	"context"

	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// RecordError records an error into the provided span and sets its status to Error.
func RecordError(span trace.Span, err error) {
	span.RecordError(err)
	span.SetStatus(codes.Error, err.Error())
}

// WithSpan wraps a function execution within a span.
func WithSpan(ctx context.Context, tracer trace.Tracer, name string, fn func(ctx context.Context) error) error {
	ctx, span := tracer.Start(ctx, name)
	defer span.End()

	err := fn(ctx)
	if err != nil {
		RecordError(span, err)
	}

	return err
}

// WithSpanResult wraps a function returning result execution within a span.
func WithSpanResult[Result any](ctx context.Context, tracer trace.Tracer, name string, fn func(ctx context.Context) (Result, error)) (Result, error) {
	ctx, span := tracer.Start(ctx, name)
	defer span.End()

	result, err := fn(ctx)
	if err != nil {
		RecordError(span, err)
	}

	return result, err
}
