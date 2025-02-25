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

// Package manifest provides data types for manifest based media files.
package manifest

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/huly-stream/internal/pkg/resconv"
)

// GenerateHLSPlaylist generates master file for master files for resolution levels
func GenerateHLSPlaylist(levels []string, outputPath, uploadID string) error {
	p := filepath.Join(outputPath, uploadID, fmt.Sprintf("%v_master.m3u8", uploadID))
	d := filepath.Dir(p)
	_ = os.MkdirAll(d, os.ModePerm)
	// #nosec
	file, err := os.Create(p)
	if err != nil {
		return err
	}
	defer func() { _ = file.Close() }()

	_, err = file.WriteString("#EXTM3U\n")
	if err != nil {
		return err
	}

	for _, res := range levels {
		var bandwidth = resconv.Bandwidth(res)
		var resolution = strings.ReplaceAll(resconv.Resolution(res), ":", "x")

		_, err = file.WriteString(fmt.Sprintf("#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%v\n", bandwidth, resolution))
		if err != nil {
			return err
		}

		_, err = file.WriteString(fmt.Sprintf("%s_%s_master.m3u8\n", uploadID, res))
		if err != nil {
			return err
		}

		_, err = file.WriteString("#EXT-X-ENDLIST")
		if err != nil {
			return err
		}
	}

	return nil
}
