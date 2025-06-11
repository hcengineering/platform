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

package queue_test

import (
	"reflect"
	"testing"

	"github.com/hcengineering/stream/internal/pkg/queue"
)

func Test_ParseConfig(t *testing.T) {
	tests := []struct {
		name     string
		config   string
		clientID string
		region   string
		want     queue.Config
	}{
		{
			name:     "Basic broker configuration",
			config:   "broker1:9092,broker2:9092",
			clientID: "test-client",
			region:   "us-west",
			want: queue.Config{
				Postfix:  "",
				Brokers:  []string{"broker1:9092", "broker2:9092"},
				ClientID: "test-client",
				Region:   "us-west",
			},
		},
		{
			name:     "Broker configuration with postfix",
			config:   "broker1:9092,broker2:9092;custom-postfix",
			clientID: "test-client",
			region:   "eu-central",
			want: queue.Config{
				Postfix:  "custom-postfix",
				Brokers:  []string{"broker1:9092", "broker2:9092"},
				ClientID: "test-client",
				Region:   "eu-central",
			},
		},
		{
			name:     "Single broker configuration",
			config:   "broker1:9092",
			clientID: "single-broker-client",
			region:   "asia-east",
			want: queue.Config{
				Postfix:  "",
				Brokers:  []string{"broker1:9092"},
				ClientID: "single-broker-client",
				Region:   "asia-east",
			},
		},
		{
			name:     "Multiple semicolons in config",
			config:   "broker1:9092,broker2:9092;postfix;extra",
			clientID: "test-client",
			region:   "us-east",
			want: queue.Config{
				Postfix:  "postfix",
				Brokers:  []string{"broker1:9092", "broker2:9092"},
				ClientID: "test-client",
				Region:   "us-east",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := queue.ParseConfig(tt.config, tt.clientID, tt.region)

			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ParseConfig() = %v, want %v", got, tt.want)
			}
		})
	}
}
