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

package resconv_test

import (
	"testing"

	"github.com/huly-stream/internal/pkg/resconv"
	"github.com/stretchr/testify/require"
)

func Test_Resconv_ShouldReturnCorrectPrefix(t *testing.T) {
	tests := []struct {
		res      string
		expected string
	}{
		{res: "320:240", expected: "360p"},
		{res: "320:360", expected: "360p"},
		{res: "640:480", expected: "480p"},
		{res: "1280:720", expected: "720p"},
		{res: "1920:1080", expected: "1080p"},
		{res: "2880:1800", expected: "1440p"},
		{res: "2560:1440", expected: "1440p"},
		{res: "3840:2160", expected: "2160p"},
		{res: "5120:2880", expected: "2160p"},
		{res: "9000:4000", expected: "4320p"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			result := resconv.Level(tt.res)
			require.Equal(t, tt.expected, result, "ResolutionFromPixels(%d)", tt.res)
		})
	}
}

func Test_Resconv_ShouldReturnCorrectPrefixes(t *testing.T) {
	tests := []struct {
		name     string
		res      string
		expected []string
	}{
		{
			name:     "pixels below smallest resolution",
			res:      "640:479",
			expected: nil,
		},
		{
			name:     "pixels equal to smallest resolution",
			res:      "640:480",
			expected: nil,
		},
		{
			name:     "pixels just above smallest resolution",
			res:      "641:480",
			expected: nil,
		},
		{
			name:     "pixels equal to 720p",
			res:      "1280:720",
			expected: []string{"480p"},
		},
		{
			name:     "pixels just above 480p",
			res:      "1280:721",
			expected: []string{"480p"},
		},
		{
			name:     "pixels equal to 1k",
			res:      "1920:1080",
			expected: []string{"720p", "480p"},
		},
		{
			name:     "pixels just above 1k",
			res:      "1920:1081",
			expected: []string{"720p", "480p"},
		},
		{
			name:     "pixels equal to 1k",
			res:      "2560:1440",
			expected: []string{"1080p", "720p"},
		},
		{
			name:     "pixels equal to 2k",
			res:      "3840:2160",
			expected: []string{"1080p", "720p"},
		},
		{
			name:     "pixels equal to 4k",
			res:      "5120:2160",
			expected: []string{"1080p", "720p"},
		},
		{
			name:     "pixels equal to 5k",
			res:      "7680:4320",
			expected: []string{"1080p", "720p"},
		},
		{
			name:     "pixels above largest resolution",
			res:      "7681:4320",
			expected: []string{"1080p", "720p"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := resconv.SubLevels(tt.res)
			require.Equal(t, tt.expected, result, "SubResolutionsFromPixels(%d) returned unexpected result", tt.res)
		})
	}
}
