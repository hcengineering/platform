//
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
//

package profile_test

import (
	"testing"

	"github.com/hcengineering/stream/internal/pkg/profile"
	"github.com/stretchr/testify/assert"
)

func TestGetProfileByName(t *testing.T) {
	tests := []struct {
		name     string
		expected profile.VideoProfile
	}{
		{
			name:     "360p",
			expected: profile.Profile360p,
		},
		{
			name:     "480p",
			expected: profile.Profile480p,
		},
		{
			name:     "720p",
			expected: profile.Profile720p,
		},
		{
			name:     "1080p",
			expected: profile.Profile1080p,
		},
		{
			name:     "1440p",
			expected: profile.Profile1440p,
		},
		{
			name:     "2160p",
			expected: profile.Profile2160p,
		},
		{
			name:     "4320p",
			expected: profile.Profile4320p,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			profile, ok := profile.GetProfileByName(tt.name)
			assert.True(t, ok)
			assert.Equal(t, tt.expected, profile)
		})
	}
}

func TestGetProfileByName_Failure(t *testing.T) {
	tests := []struct {
		name string
	}{
		{
			name: "foo",
		},
		{
			name: "original",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, ok := profile.GetProfileByName(tt.name)
			assert.False(t, ok)
		})
	}
}

func TestMakeProfileOriginal(t *testing.T) {
	tests := []struct {
		name     string
		width    int
		height   int
		expected profile.VideoProfile
	}{
		{
			name:   "480p",
			width:  640,
			height: 480,
			expected: profile.VideoProfile{
				Name:       "orig",
				VideoCodec: "copy",
				AudioCodec: "copy",
				Width:      640,
				Height:     480,
				Bandwidth:  2000000,
				CRF:        23,
			},
		},
		{
			name:   "1440p",
			width:  2000,
			height: 1200,
			expected: profile.VideoProfile{
				Name:       "orig",
				VideoCodec: "copy",
				AudioCodec: "copy",
				Width:      2000,
				Height:     1200,
				Bandwidth:  8000000,
				CRF:        23,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			profile := profile.MakeProfileOriginal(tt.width, tt.height)
			assert.Equal(t, tt.expected, profile)
		})
	}
}

func TestMakeProfileOriginalT(t *testing.T) {
	tests := []struct {
		name     string
		width    int
		height   int
		expected profile.VideoProfile
	}{
		{
			name:   "720p",
			width:  1280,
			height: 720,
			expected: profile.VideoProfile{
				Name:       "orig",
				VideoCodec: "libx264",
				AudioCodec: "aac",
				Width:      1280,
				Height:     720,
				Bandwidth:  5000000,
				CRF:        23,
			},
		},
		{
			name:   "2160p",
			width:  3840,
			height: 2160,
			expected: profile.VideoProfile{
				Name:       "orig",
				VideoCodec: "libx264",
				AudioCodec: "aac",
				Width:      3840,
				Height:     2160,
				Bandwidth:  25000000,
				CRF:        23,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			profile := profile.MakeProfileOriginalT(tt.width, tt.height)
			assert.Equal(t, tt.expected, profile)
		})
	}
}
