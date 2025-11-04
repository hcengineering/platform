git#!/bin/bash

# Script to display coverage summary from lcov.info file

LCOV_FILE="${1:-coverage/lcov.info}"

if [ ! -f "$LCOV_FILE" ]; then
    echo "Error: LCOV file not found: $LCOV_FILE"
    exit 1
fi

echo "=============================================="
echo "COVERAGE SUMMARY BY PACKAGE"
echo "=============================================="
echo ""

# Parse lcov.info and aggregate by package
awk '
BEGIN {
  current_file = "";
}
/^SF:/ {
  current_file = $0;
  sub(/^SF:/, "", current_file);
  # Extract package name from path
  split(current_file, parts, "/");
  pkg = "";
  for (i=1; i<=length(parts); i++) {
    if (parts[i] == "packages" && i+1 <= length(parts)) {
      pkg = parts[i+1];
      break;
    }
  }
  total_lines[current_file] = 0;
  covered_lines[current_file] = 0;
  file_pkg[current_file] = pkg;
}
/^DA:/ {
  split($0, parts, ",");
  total_lines[current_file]++;
  if (parts[2] > 0) covered_lines[current_file]++;
}
END {
  # Aggregate by package
  for (file in total_lines) {
    pkg = file_pkg[file];
    if (pkg != "") {
      pkg_total[pkg] += total_lines[file];
      pkg_covered[pkg] += covered_lines[file];
    }
  }

  printf "%-25s %10s %10s %10s\n", "Package", "Covered", "Total", "Coverage";
  print "----------------------------------------------";

  overall_covered = 0;
  overall_total = 0;

  # Display packages
  for (pkg in pkg_total) {
    pct = (pkg_covered[pkg] / pkg_total[pkg]) * 100;
    printf "%-25s %10d %10d %9.2f%%\n", pkg, pkg_covered[pkg], pkg_total[pkg], pct;
    overall_covered += pkg_covered[pkg];
    overall_total += pkg_total[pkg];
  }

  print "----------------------------------------------";
  overall_pct = (overall_covered / overall_total) * 100;
  printf "%-25s %10d %10d %9.2f%%\n", "TOTAL", overall_covered, overall_total, overall_pct;
  print "";
}' "$LCOV_FILE"

echo "=============================================="
echo ""
echo "HTML report available at: coverage/html/index.html"
echo "Merged LCOV file available at: $LCOV_FILE"
