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

package mediaconvert

import (
	"bytes"
	"context"
	"io"
	"os"
	"os/exec"
	"sync"

	"github.com/hcengineering/stream/internal/pkg/log"
	"go.uber.org/zap"
)

// CommandExecutor executes multiple commands in parallel
type CommandExecutor interface {
	Execute(commands []*exec.Cmd) error
}

type commandExecutor struct {
	logger *zap.Logger
}

var _ CommandExecutor = (*commandExecutor)(nil)

// NewCommandExecutor creates a new instance of command executor
func NewCommandExecutor(ctx context.Context) CommandExecutor {
	return &commandExecutor{
		logger: log.FromContext(ctx),
	}
}

// Execute executes multiple commands in parallel
func (e *commandExecutor) Execute(commands []*exec.Cmd) error {
	logger := e.logger
	errCh := make(chan error, len(commands))

	var mu sync.Mutex
	var wg sync.WaitGroup
	for _, cmd := range commands {
		wg.Add(1)

		go func(cmd *exec.Cmd) {
			defer wg.Done()

			var stdoutBuf = &bytes.Buffer{}
			var stderrBuf = &bytes.Buffer{}

			if logger.Core().Enabled(zap.DebugLevel) {
				cmd.Stdout = io.MultiWriter(os.Stdout, stdoutBuf)
				cmd.Stderr = io.MultiWriter(os.Stderr, stderrBuf)
			} else {
				cmd.Stdout = stdoutBuf
				cmd.Stderr = stderrBuf
			}

			logger.Info("run command", zap.String("cmd", cmd.String()))
			if err := cmd.Run(); err != nil {
				errCh <- err

				// Lock so only on goroutine can write to stdout/stderr at the same time
				mu.Lock()
				defer mu.Unlock()
				logger.Error("can not wait for command end", zap.Error(err), zap.String("cmd", cmd.String()))
				if _, writeErr := os.Stdout.Write(stdoutBuf.Bytes()); writeErr != nil {
					logger.Error("can not write stdout ", zap.Error(writeErr))
				}
				if _, writeErr := os.Stderr.Write(stderrBuf.Bytes()); writeErr != nil {
					logger.Error("can not write stderr", zap.Error(writeErr))
				}
			}
		}(cmd)
	}

	wg.Wait()
	close(errCh)

	for err := range errCh {
		return err
	}

	return nil
}
