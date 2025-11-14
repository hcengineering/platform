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

package manifest_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/hcengineering/stream/internal/pkg/manifest"
	"github.com/hcengineering/stream/internal/pkg/profile"
	"github.com/stretchr/testify/require"
)

func TestGenerateHLSPlaylist(t *testing.T) {
	profiles := []profile.VideoProfile{
		profile.Profile360p,
		profile.Profile480p,
		profile.Profile720p,
		profile.Profile1080p,
		profile.Profile1440p,
	}
	uploadID := "test123"
	defer func() {
		_ = os.RemoveAll(uploadID)
	}()

	err := manifest.GenerateHLSPlaylist(profiles, "", uploadID)
	require.NoError(t, err)

	outputPath := filepath.Join(uploadID, manifest.MasterPlaylistFileName(uploadID))

	_, err = os.Stat(outputPath)
	require.NoError(t, err, "Master playlist file should exist")

	// #nosec
	data, err := os.ReadFile(outputPath)
	require.NoError(t, err, "Error reading the generated file")

	playlistContent := string(data)

	require.Contains(t, playlistContent, "#EXTM3U", "File must start with #EXTM3U")

	for _, prof := range profiles {
		expectedLine := manifest.PlaylistFileName(uploadID, prof.Name)
		require.Contains(t, playlistContent, expectedLine, "Missing expected reference: "+expectedLine)
	}
}

func TestMasterPlaylistFileName(t *testing.T) {
	filename := manifest.MasterPlaylistFileName("example")
	require.Equal(t, "example_master.m3u8", filename)
}

func TestPlaylistFileName(t *testing.T) {
	filename := manifest.PlaylistFileName("example", "720p")
	require.Equal(t, "example_720p.m3u8", filename)
}

func TestThumbnailFileName(t *testing.T) {
	filename := manifest.ThumbnailFileName("example")
	require.Equal(t, "example.jpg", filename)
}
