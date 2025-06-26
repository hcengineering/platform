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

// Package profile provides video profiles
package profile

import (
	"fmt"

	"github.com/hcengineering/stream/internal/pkg/resconv"
)

// VideoProfile represents a video profile
type VideoProfile struct {
	Name      string
	Width     int // 0 means keep original
	Height    int // 0 means keep original
	Bandwidth int
	Scale     bool

	// Codec settings
	VideoCodec string
	AudioCodec string

	// Advanced encoding settings
	CRF int // Constant Rate Factor (0-51 for x264)
}

// profileOriginal is a profile for original video without transcoding
var profileOriginal = VideoProfile{
	Name:       "orig",
	Scale:      false,
	VideoCodec: "copy",
	AudioCodec: "copy",
	CRF:        23,
}

// profileOriginalT is a profile for transcoding video in the original resolution
var profileOriginalT = VideoProfile{
	Name:       "orig",
	Scale:      false,
	VideoCodec: "libx264",
	AudioCodec: "aac",
	CRF:         23,
}

// Profile360p is a profile for transcoding video in 360p
var Profile360p = VideoProfile{
	Name:       "360p",
	Scale:      true,
	Width:      640,
	Height:     360,
	Bandwidth:  500000,
	VideoCodec: "libx264",
	AudioCodec: "aac",
	CRF:        28,
}

// Profile480p is a profile for transcoding video in 480p
var Profile480p = VideoProfile{
	Name:       "480p",
	Scale:      true,
	Width:      854,
	Height:     480,
	Bandwidth:  2000000,
	VideoCodec: "libx264",
	AudioCodec: "aac",
	CRF:        27,
}

// Profile720p is a profile for transcoding video in 720p
var Profile720p = VideoProfile{
	Name:       "720p",
	Scale:      true,
	Width:      1280,
	Height:     720,
	Bandwidth:  5000000,
	VideoCodec: "libx264",
	AudioCodec: "aac",
	CRF: 25,
}

// Profile1080p is a profile for transcoding video in 1080p
var Profile1080p = VideoProfile{
	Name:       "1080p",
	Scale:      true,
	Width:      1920,
	Height:     1080,
	Bandwidth:  8000000,
	VideoCodec: "libx264",
	AudioCodec: "aac",
	CRF:        23,
}

// Profile1440p is a profile for transcoding video in 1440p
var Profile1440p = VideoProfile{
	Name:       "1440p",
	Scale:      true,
	Width:      2560,
	Height:     1440,
	Bandwidth:  12000000,
	VideoCodec: "libx264",
	AudioCodec: "aac",
	CRF:        23,
}

// Profile2160p is a profile for transcoding video in 2160p
var Profile2160p = VideoProfile{
	Name:       "2160p",
	Scale:      true,
	Width:      3840,
	Height:     2160,
	Bandwidth:  25000000,
	VideoCodec: "libx264", // Consider libx265
	AudioCodec: "aac",
	CRF:        22,
}

// Profile4320p is a profile for transcoding video in 360p
var Profile4320p = VideoProfile{
	Name:       "4320p",
	Scale:      true,
	Width:      7680,
	Height:     4320,
	Bandwidth:  50000000,
	VideoCodec: "libx264", // Consider libx265
	AudioCodec: "aac",
	CRF:        22,
}

var Profiles = map[string]VideoProfile{
	"360p":  Profile360p,
	"480p":  Profile480p,
	"720p":  Profile720p,
	"1080p": Profile1080p,
	"1440p": Profile1440p,
	"2160p": Profile2160p,
	"4320p": Profile4320p,
}

func MakeProfileOriginal(width, height int) VideoProfile {
	resolution := fmt.Sprintf("%v:%v", width, height)
	level := resconv.Level(resolution)
	bandwidth := resconv.Bandwidth(level)

	profile := profileOriginal
	//profile.Name = level
	profile.Width = width
	profile.Height = height
	profile.Bandwidth = bandwidth

	return profile
}

func MakeProfileOriginalT(width, height int) VideoProfile {
	resolution := fmt.Sprintf("%v:%v", width, height)
	level := resconv.Level(resolution)
	bandwidth := resconv.Bandwidth(level)

	profile := profileOriginalT
	//profile.Name = level
	profile.Width = width
	profile.Height = height
	profile.Bandwidth = bandwidth

	return profile
}

// GetProfileByName returns a VideoProfile by name
func GetProfileByName(name string) (VideoProfile, bool) {
	profile, ok := Profiles[name]
	return profile, ok
}
