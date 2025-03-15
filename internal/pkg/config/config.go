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

// Package config provides configuration for the application
package config

import (
	"net/url"
	"time"

	"github.com/pkg/errors"

	"github.com/kelseyhightower/envconfig"
)

// Config represents configuration for the huly-stream application.
type Config struct {
	LogLevel                string   `split_words:"true" default:"debug" desc:"sets log level for the application"`
	ServerSecret            string   `split_words:"true" default:"" desc:"server secret required to generate and verify tokens"`
	PprofEnabled            bool     `split_words:"true" default:"true" desc:"starts profile server on localhost:6060 if true"`
	Insecure                bool     `split_words:"true" default:"false" desc:"ignores authorization check if true"`
	ServeURL                string   `split_words:"true" desc:"listen on url" default:"0.0.0.0:1080"`
	EndpointURL             *url.URL `split_words:"true" default:"s3://127.0.0.1:9000" desc:"S3 or Datalake endpoint, example: s3://my-ip-address, datalake://my-ip-address"`
	MaxParallelScalingCount int      `split_words:"true" default:"2" desc:"how much parallel scaling can be processed"`
	MaxThreadCount          int      `split_words:"true" default:"4" desc:"max number of threads for transcoder"`

	OutputDir string        `split_words:"true" default:"/tmp/transcoing/" desc:"path to the directory with transcoding result."`
	Timeout   time.Duration `default:"5m" desc:"timeout for the upload"`
}

// FromEnv creates new Config from env
func FromEnv() (*Config, error) {
	var result Config

	if err := envconfig.Usage("stream", &result); err != nil {
		return nil, err
	}

	if err := envconfig.Process("stream", &result); err != nil {
		return nil, err
	}

	if *result.EndpointURL == (url.URL{}) {
		result.EndpointURL = nil
	}

	if !result.Insecure && result.ServerSecret == "" {
		return nil, errors.New("server secret must be provided for secure confgiuration")
	}

	return &result, nil
}

// Endpoint returns upload address
func (c *Config) Endpoint() *url.URL {
	var scheme = "https"
	if c.Insecure {
		scheme = "http"
	}
	return &url.URL{
		Scheme: scheme,
		Host:   c.EndpointURL.Host,
	}
}
