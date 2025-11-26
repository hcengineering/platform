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

package executor_test

import (
	"context"
	"os/exec"
	"testing"
	"time"

	"github.com/hcengineering/stream/internal/pkg/executor"
	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/stretchr/testify/assert"
)

func TestCommandExecutor_Execute_Success(t *testing.T) {
	tests := []struct {
		name     string
		commands []*exec.Cmd
	}{
		{
			name: "single command",
			commands: []*exec.Cmd{
				exec.Command("echo", "test"),
			},
		},
		{
			name: "multiple commands",
			commands: []*exec.Cmd{
				exec.Command("echo", "test1"),
				exec.Command("echo", "test2"),
				exec.Command("echo", "test3"),
			},
		},
		{
			name:     "empty commands",
			commands: []*exec.Cmd{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			ctx = log.WithFields(ctx)

			err := executor.ExecuteCommands(ctx, tt.commands)
			assert.NoError(t, err)
		})
	}
}

func TestCommandExecutor_Execute_Error(t *testing.T) {
	tests := []struct {
		name          string
		commands      []*exec.Cmd
		expectedError bool
	}{
		{
			name: "single failing command",
			commands: []*exec.Cmd{
				exec.Command("false"),
			},
			expectedError: true,
		},
		{
			name: "mixed success and failure",
			commands: []*exec.Cmd{
				exec.Command("echo", "success"),
				exec.Command("false"),
				exec.Command("echo", "another success"),
			},
			expectedError: true,
		},
		{
			name: "non-existent command",
			commands: []*exec.Cmd{
				exec.Command("this-command-does-not-exist"),
			},
			expectedError: true,
		},
		{
			name: "multiple failures",
			commands: []*exec.Cmd{
				exec.Command("false"),
				exec.Command("false"),
				exec.Command("false"),
			},
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			ctx = log.WithFields(ctx)

			err := executor.ExecuteCommands(ctx, tt.commands)
			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestCommandExecutor_Execute_Parallel(t *testing.T) {
	// Create commands that sleep for different durations
	commands := []*exec.Cmd{
		exec.Command("sleep", "0.1"),
		exec.Command("sleep", "0.1"),
		exec.Command("sleep", "0.1"),
		exec.Command("sleep", "0.1"),
	}

	ctx := context.Background()
	ctx = log.WithFields(ctx)

	start := time.Now()
	err := executor.ExecuteCommands(ctx, commands)
	duration := time.Since(start)

	assert.NoError(t, err)
	// If commands run in parallel, total time should be close to 0.1s, not 0.4s
	assert.Less(t, duration, 200*time.Millisecond)
}
