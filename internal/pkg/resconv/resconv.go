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

// Package resconv implements conversions to and from string representations of video resolutions.
package resconv

import (
	"sort"
	"strconv"
	"strings"
)

const defaultLevel = "320p"

var prefixes = []struct {
	pixels int
	label  string
}{
	{pixels: 640 * 480, label: "320p"},
	{pixels: 1280 * 720, label: "480p"},
	{pixels: 1920 * 1080, label: "720p"},
	{pixels: 2560 * 1440, label: "1080p"},
	{pixels: 3840 * 2160, label: "2k"},
	{pixels: 5120 * 2880, label: "4k"},
	{pixels: 7680 * 4320, label: "5k"},
}

var bandwidthMap = map[string]int{
	"320p":  300000,
	"360p":  500000,
	"480p":  2000000,
	"720p":  5000000,
	"1080p": 8000000,
	"1440p": 16000000,
	"4k":    25000000,
	"8k":    50000000,
}

var resolutions = map[string]string{
	"320p":  "480:240",
	"480p":  "640:480",
	"720p":  "1280:720",
	"1080p": "1920:1080",
	"2k":    "2048:1080",
	"4k":    "3840:2160",
	"5k":    "5120:2880",
	"8k":    "7680:4320",
}

// SubLevels returns sublevels for the resolution
func SubLevels(resolution string) (res []string) {
	var pixels = Pixels(resolution)
	var idx = sort.Search(len(prefixes), func(i int) bool {
		return pixels < prefixes[i].pixels
	})
	if idx < 2 {
		return res
	}

	idx--
	idx = min(idx, 3)

	for idx >= 1 {
		res = append(res, prefixes[idx].label)
		idx--
		if len(res) == 2 {
			break
		}
	}

	return res
}

// Resolution returns default resolution based on the level
func Resolution(level string) string {
	if v, ok := resolutions[level]; ok {
		return v
	}
	return Resolution(defaultLevel)
}

// Level converts the resolution to short prefix
func Level(resolution string) string {
	var pixels = Pixels(resolution)
	idx := sort.Search(len(prefixes), func(i int) bool {
		return pixels < prefixes[i].pixels
	})
	if idx == len(prefixes) {
		return "8k"
	}

	return prefixes[idx].label
}

// Pixels returns amount of pixels for the resolution
func Pixels(resolution string) int {
	var parts = strings.Split(resolution, ":")
	var w, h = 420, 240

	if len(parts) > 1 {
		var _w, _ = strconv.Atoi(parts[0])
		var _h, _ = strconv.Atoi(parts[1])
		w = max(w, _w)
		h = max(h, _h)
	}

	return w * h
}

// Bandwidth returns default bandwidth for the resolution
func Bandwidth(resolution string) int {
	if v, ok := bandwidthMap[resolution]; ok {
		return v
	}

	return bandwidthMap[defaultLevel]
}
