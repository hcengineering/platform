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

	"github.com/hcengineering/stream/internal/pkg/profile"
)

// GenerateHLSPlaylist generates master file for master files for resolution levels
func GenerateHLSPlaylist(profiles []profile.VideoProfile, outputPath, uploadID string) error {
	p := filepath.Join(outputPath, uploadID, MasterPlaylistFileName(uploadID))
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

	for _, profile := range profiles {
		var bandwidth = profile.Bandwidth
		var resolution = fmt.Sprintf("%vx%v", profile.Width, profile.Height)

		_, err = fmt.Fprintf(file, "#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%v\n", bandwidth, resolution)
		if err != nil {
			return err
		}

		_, err = file.WriteString(PlaylistFileName(uploadID, profile.Name) + "\n")
		if err != nil {
			return err
		}
	}

	return nil
}

// MasterPlaylistFileName generates master playlist file name
func MasterPlaylistFileName(source string) string {
	return fmt.Sprintf("%s_master.m3u8", source)
}

// PlaylistFileName generates profile playlist file name
func PlaylistFileName(source, profile string) string {
	return fmt.Sprintf("%s_%s.m3u8", source, profile)
}

// ThumbnailFileName generates thumbnail file name
func ThumbnailFileName(source string) string {
	return fmt.Sprintf("%s.jpg", source)
}
