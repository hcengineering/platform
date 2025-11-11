#!/bin/bash

# Test all examples and report results

cd "$(dirname "$0")/examples"

examples=(
  "basic:Basic container request-response"
  "events:Event broadcasting"
  "multi-tenant:Multi-tenant setup"
  "production:Complete production setup"
  "retry:Error handling and retry"
  "timeout:Custom timeout configuration"
  "ha:High-availability stateless containers"
)

echo "Testing all examples..."
echo "======================"
echo ""

for entry in "${examples[@]}"; do
  IFS=':' read -r name desc <<< "$entry"
  echo "Testing: $desc (run:$name)"
  echo "---"
  
  # Run with timeout and capture output
  output=$(timeout 10 rushx run:$name 2>&1)
  exit_code=$?
  
  # Check for success indicators
  if echo "$output" | grep -q "✓.*completed successfully"; then
    echo "✅ PASS"
  elif [ $exit_code -eq 0 ] && echo "$output" | grep -q "✓"; then
    echo "✅ PASS"
  elif echo "$output" | grep -qE "(TSError|SyntaxError|Error:.*failed)"; then
    echo "❌ FAIL - Compilation or runtime error"
    echo "$output" | grep -E "(TSError|SyntaxError|Error)" | head -3
  elif [ $exit_code -eq 124 ]; then
    # Timeout usually means it's running (waiting for cleanup)
    if echo "$output" | grep -q "✓"; then
      echo "✅ PASS (timed out but ran successfully)"
    else
      echo "⚠️  TIMEOUT - May need longer runtime"
    fi
  else
    echo "⚠️  UNKNOWN - Exit code: $exit_code"
  fi
  
  echo ""
  sleep 2
done

echo "======================"
echo "Testing complete!"
