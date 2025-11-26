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

package main

import (
	"context"
	"time"

	"github.com/hcengineering/stream/internal/pkg/config"
	"github.com/pkg/errors"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/exporters/stdout/stdoutlog"
	"go.opentelemetry.io/otel/exporters/stdout/stdoutmetric"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/log/global"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.37.0"
)

// setupOTelSDK bootstraps the OpenTelemetry pipeline.
// If it does not return an error, make sure to call shutdown for proper cleanup.
func setupOTelSDK(ctx context.Context, cfg *config.Config) (func(context.Context) error, error) {
	if !cfg.OtelEnabled {
		return func(context.Context) error { return nil }, nil
	}

	var shutdownFuncs []func(context.Context) error

	shutdown := func(ctx context.Context) error {
		var shutdownErr error
		for _, fn := range shutdownFuncs {
			if err := fn(ctx); err != nil {
				if shutdownErr == nil {
					shutdownErr = err
				} else {
					shutdownErr = errors.Wrap(err, shutdownErr.Error())
				}
			}
		}
		shutdownFuncs = nil
		return shutdownErr
	}

	res, err := newResource(cfg)
	if err != nil {
		return shutdown, err
	}

	prop := newPropagator()
	otel.SetTextMapPropagator(prop)

	if cfg.OtelTracesEnabled {
		tracerProvider, tracerErr := newTracerProvider(ctx, res)
		if tracerErr != nil {
			return shutdown, tracerErr
		}
		shutdownFuncs = append(shutdownFuncs, tracerProvider.Shutdown)
		otel.SetTracerProvider(tracerProvider)
	}

	if cfg.OtelMetricsEnabled {
		meterProvider, meterErr := newMeterProvider(ctx, res)
		if meterErr != nil {
			return shutdown, meterErr
		}
		shutdownFuncs = append(shutdownFuncs, meterProvider.Shutdown)
		otel.SetMeterProvider(meterProvider)
	}

	if cfg.OtelLogsEnabled {
		loggerProvider, loggerErr := newLoggerProvider(ctx, res)
		if loggerErr != nil {
			return shutdown, loggerErr
		}
		shutdownFuncs = append(shutdownFuncs, loggerProvider.Shutdown)
		global.SetLoggerProvider(loggerProvider)
	}

	return shutdown, err
}

func newResource(cfg *config.Config) (*resource.Resource, error) {
	defaultRes := resource.Default()

	customRes := resource.NewWithAttributes(
		semconv.SchemaURL,
		semconv.ServiceName(cfg.OtelServiceName),
		semconv.ServiceVersion(cfg.OtelServiceVersion),
	)

	return resource.Merge(defaultRes, customRes)
}

func newPropagator() propagation.TextMapPropagator {
	return propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	)
}

func newTracerProvider(ctx context.Context, res *resource.Resource) (*trace.TracerProvider, error) {
	var exporter trace.SpanExporter
	var err error

	exporter, err = otlptracehttp.New(ctx)
	if err != nil {
		exporter, err = stdouttrace.New(stdouttrace.WithPrettyPrint())
		if err != nil {
			return nil, err
		}
	}

	tracerProvider := trace.NewTracerProvider(
		trace.WithResource(res),
		trace.WithBatcher(exporter,
			trace.WithBatchTimeout(5*time.Second),
		),
	)
	return tracerProvider, nil
}

func newMeterProvider(ctx context.Context, res *resource.Resource) (*metric.MeterProvider, error) {
	var exporter metric.Exporter
	var err error

	exporter, err = otlpmetrichttp.New(ctx)
	if err != nil {
		exporter, err = stdoutmetric.New()
		if err != nil {
			return nil, err
		}
	}

	meterProvider := metric.NewMeterProvider(
		metric.WithResource(res),
		metric.WithReader(metric.NewPeriodicReader(exporter,
			metric.WithInterval(60*time.Second))),
	)

	return meterProvider, nil
}

func newLoggerProvider(ctx context.Context, res *resource.Resource) (*log.LoggerProvider, error) {
	var exporter log.Exporter
	var err error

	exporter, err = otlploghttp.New(ctx)
	if err != nil {
		exporter, err = stdoutlog.New()
		if err != nil {
			return nil, err
		}
	}

	loggerProvider := log.NewLoggerProvider(
		log.WithResource(res),
		log.WithProcessor(log.NewBatchProcessor(exporter)),
	)

	return loggerProvider, nil
}
