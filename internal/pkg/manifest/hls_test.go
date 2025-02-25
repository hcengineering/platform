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

	"github.com/huly-stream/internal/pkg/manifest"
	"github.com/stretchr/testify/require"
)

func TestGenerateHLSPlaylist(t *testing.T) {
	resolutions := []string{"320p", "480p", "720p", "1080p", "4k", "8k"}
	uploadID := "test123"

	err := manifest.GenerateHLSPlaylist(resolutions, "", uploadID)
	require.NoError(t, err)

	outputPath := filepath.Join(uploadID, uploadID+"_master.m3u8")

	_, err = os.Stat(outputPath)
	require.NoError(t, err, "Master playlist file should exist")

	// #nosec
	data, err := os.ReadFile(outputPath)
	require.NoError(t, err, "Error reading the generated file")

	playlistContent := string(data)

	require.Contains(t, playlistContent, "#EXTM3U", "File must start with #EXTM3U")

	for _, res := range resolutions {
		expectedLine := uploadID + "_" + res + "_master.m3u8"
		require.Contains(t, playlistContent, expectedLine, "Missing expected reference: "+expectedLine)
	}

	_ = os.RemoveAll(uploadID)
}
