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

package queue

import "strings"

// Config reprents queue config
type Config struct {
	Postfix  string
	Brokers  []string
	ClientID string
	Region   string
}

func ParseConfig(config, clientID, region string) Config {
	var parts = strings.Split(config, ";")
	var brokers = strings.Split(parts[0], ",")
	var postfix = ""

	if len(parts) > 1 {
		postfix = parts[1]
	}

	var cfg = Config{
		Postfix:  postfix,
		Brokers:  brokers,
		ClientID: clientID,
		Region:   region,
	}

	return cfg
}
