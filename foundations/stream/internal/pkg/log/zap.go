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

// Package log provides simple api for using inherited logging
package log

import (
	"context"

	"go.uber.org/zap"
)

type contextKey struct{}

// WithFields createsa new context with zap.Logger and passed fields
func WithFields(ctx context.Context, fields ...zap.Field) context.Context {
	var logger = FromContext(ctx)
	if logger == nil {
		var err error
		logger, err = zap.NewDevelopment()
		if err != nil {
			panic(err.Error())
		}
		logger.Info("zap logger was initialized")
		go func() {
			<-ctx.Done()
			_ = logger.Sync()
		}()
	}
	return context.WithValue(ctx, contextKey{}, logger.With(fields...))
}

// FromContext returns zap.Logger from the context
func FromContext(ctx context.Context) *zap.Logger {
	var val = ctx.Value(contextKey{})
	if val == nil {
		return nil
	}
	return val.(*zap.Logger)
}
