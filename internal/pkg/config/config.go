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

	"github.com/kelseyhightower/envconfig"
)

// Config represents configuration for the huly-stream application.
type Config struct {
	SecretToken           string   `split_words:"true" desc:"secret token for authorize requests"`
	LogLevel              string   `split_words:"true" default:"debug" desc:"sets log level for the application"`
	PprofEnabled          bool     `default:"false" split_words:"true" desc:"starts profile server on localhost:6060 if true"`
	Insecure              bool     `default:"false" desc:"ignores authorization check if true"`
	ServeURL              string   `split_words:"true" desc:"app listen url" default:"0.0.0.0:1080"`
	EndpointURL           *url.URL `split_words:"true" desc:"S3 or Datalake endpoint, example: s3://my-ip-address, datalake://my-ip-address"`
	MaxCapacity           int64    `split_words:"true" default:"6220800" desc:"represents the amount of maximum possible capacity for the transcoding. The default value is 1920 * 1080 * 3."`
	MaxThreads            int      `split_words:"true" default:"4" desc:"means upper bound for the transcoing provider."`
	OutputDir             string   `split_words:"true" default:"/tmp/transcoing/" desc:"path to the directory with transcoding result."`
	RemoveContentOnUpload bool     `split_words:"true" default:"true" desc:"deletes all content when content delivered if true"`
	UploadRawContent      bool     `split_words:"true" default:"false" desc:"uploads content in raw quality to the endpoint if true"`
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

	return &result, nil
}
