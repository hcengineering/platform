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

package token_test

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/hcengineering/stream/internal/pkg/token"
	"github.com/stretchr/testify/require"
)

func Test_GenerateSimpleServiceToken(t *testing.T) {
	var _, err = token.NewToken("secret", "ws", "issuer", "aud")
	require.NoError(t, err)
}

func Test_ParseSimpleServiceToken(t *testing.T) {
	const secret = "secret"
	tokenString, err := token.NewToken(secret, "ws", "issuer", "aud")
	require.NoError(t, err)
	tok, err := token.Decode(secret, tokenString)
	require.NoError(t, err)
	require.Equal(t, tok.Issuer, "issuer")
	require.Equal(t, tok.Audience, jwt.ClaimStrings{"aud"})
	require.Equal(t, tok.Workspace, "ws")
	require.True(t, tok.ExpiresAt.After(time.Now()))
}
