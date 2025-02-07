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
	"testing"

	"github.com/huly-stream/internal/pkg/manifest"
	"github.com/stretchr/testify/assert"
)

func TestToM3U8(t *testing.T) {
	tests := []struct {
		name     string
		manifest manifest.HLSManifest
		expected string
	}{
		{
			name: "simple manifest",
			manifest: manifest.HLSManifest{
				Version:        3,
				TargetDuration: 10,
				SequenceNumber: 1,
				Segments: []manifest.Segment{
					{URI: "segment1.ts", Duration: 9.5, Title: "Segment 1"},
					{URI: "segment2.ts", Duration: 9.0, Title: "Segment 2"},
				},
				EndList: true,
			},
			expected: `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:9.50,Segment 1
segment1.ts
#EXTINF:9.00,Segment 2
segment2.ts
#EXT-X-ENDLIST
`,
		},
		{
			name: "empty manifest",
			manifest: manifest.HLSManifest{
				Version:        3,
				TargetDuration: 10,
				SequenceNumber: 1,
				Segments:       []manifest.Segment{},
				EndList:        false,
			},
			expected: `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:1
`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := tt.manifest.ToM3U8()
			assert.Equal(t, tt.expected, actual)
		})
	}
}

func TestFromM3U8(t *testing.T) {
	tests := []struct {
		name     string
		data     string
		expected manifest.HLSManifest
		err      bool
	}{
		{
			name: "valid manifest",
			data: `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:9.50,Segment 1
segment1.ts
#EXTINF:9.00,Segment 2
segment2.ts
#EXT-X-ENDLIST
`,
			expected: manifest.HLSManifest{
				Version:        3,
				TargetDuration: 10,
				SequenceNumber: 1,
				Segments: []manifest.Segment{
					{URI: "segment1.ts", Duration: 9.5, Title: "Segment 1"},
					{URI: "segment2.ts", Duration: 9.0, Title: "Segment 2"},
				},
				EndList: true,
			},
			err: false,
		},
		// 		{
		// 			name: "missing target duration",
		// 			data: `#EXTM3U
		// #EXT-X-VERSION:3
		// #EXT-X-MEDIA-SEQUENCE:1
		// #EXTINF:9.50,Segment 1
		// segment1.ts
		// `,
		// 			expected: manifest.HLSManifest{},
		// 			err:      true,
		// 		},
		{
			name: "empty file",
			data: "",
			expected: manifest.HLSManifest{
				Version:        0,
				TargetDuration: 0,
				SequenceNumber: 0,
				EndList:        false,
			},
			err: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual, err := manifest.FromM3U8(tt.data)
			if tt.err {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, *actual)
			}
		})
	}
}
