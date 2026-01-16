#!/bin/bash

# Benchmark: ReBang vs Unduck
# Tests 10 different queries, 50 times each

QUERIES=(
  "cats%20!yt"
  "hello%20!g"
  "rust%20!gh"
  "climate%20!w"
  "react%20!npm"
  "movie%20!imdb"
  "pizza%20!maps"
  "error%20!so"
  "song%20!sp"
  "news%20!r"
)

QUERY_NAMES=(
  "!yt (YouTube)"
  "!g (Google)"
  "!gh (GitHub)"
  "!w (Wikipedia)"
  "!npm (NPM)"
  "!imdb (IMDB)"
  "!maps (Google Maps)"
  "!so (StackOverflow)"
  "!sp (Spotify)"
  "!r (Reddit)"
)

ITERATIONS=50

echo "=============================================="
echo "  ReBang vs Unduck Performance Benchmark"
echo "=============================================="
echo ""
echo "Iterations per query: $ITERATIONS"
echo "Date: $(date)"
echo ""

# Arrays to store all results
declare -a REBANG_AVGS
declare -a UNDUCK_AVGS

for i in "${!QUERIES[@]}"; do
  query="${QUERIES[$i]}"
  name="${QUERY_NAMES[$i]}"
  
  echo "Testing: $name"
  echo "  Query: $query"
  
  # Benchmark ReBang
  rebang_total=0
  for j in $(seq 1 $ITERATIONS); do
    time=$(curl -w "%{time_total}" -s -o /dev/null -I "https://rebang.online/?q=$query")
    rebang_total=$(echo "$rebang_total + $time" | bc)
  done
  rebang_avg=$(echo "scale=4; $rebang_total / $ITERATIONS * 1000" | bc)
  REBANG_AVGS+=("$rebang_avg")
  
  # Benchmark Unduck
  unduck_total=0
  for j in $(seq 1 $ITERATIONS); do
    time=$(curl -w "%{time_total}" -s -o /dev/null -I "https://unduck.link/?q=$query")
    unduck_total=$(echo "$unduck_total + $time" | bc)
  done
  unduck_avg=$(echo "scale=4; $unduck_total / $ITERATIONS * 1000" | bc)
  UNDUCK_AVGS+=("$unduck_avg")
  
  # Calculate improvement
  if (( $(echo "$unduck_avg > 0" | bc -l) )); then
    improvement=$(echo "scale=1; $unduck_avg / $rebang_avg" | bc)
  else
    improvement="N/A"
  fi
  
  echo "  ReBang:  ${rebang_avg}ms avg"
  echo "  Unduck:  ${unduck_avg}ms avg"
  echo "  ReBang is ${improvement}x faster"
  echo ""
done

echo "=============================================="
echo "  SUMMARY"
echo "=============================================="
echo ""
printf "%-20s %12s %12s %10s\n" "Bang" "ReBang (ms)" "Unduck (ms)" "Speedup"
printf "%-20s %12s %12s %10s\n" "----" "-----------" "-----------" "-------"

rebang_grand_total=0
unduck_grand_total=0

for i in "${!QUERY_NAMES[@]}"; do
  name="${QUERY_NAMES[$i]}"
  rebang="${REBANG_AVGS[$i]}"
  unduck="${UNDUCK_AVGS[$i]}"
  
  rebang_grand_total=$(echo "$rebang_grand_total + $rebang" | bc)
  unduck_grand_total=$(echo "$unduck_grand_total + $unduck" | bc)
  
  if (( $(echo "$unduck > 0" | bc -l) )); then
    speedup=$(echo "scale=2; $unduck / $rebang" | bc)
  else
    speedup="N/A"
  fi
  
  printf "%-20s %12.2f %12.2f %9.2fx\n" "$name" "$rebang" "$unduck" "$speedup"
done

rebang_overall=$(echo "scale=2; $rebang_grand_total / ${#QUERY_NAMES[@]}" | bc)
unduck_overall=$(echo "scale=2; $unduck_grand_total / ${#QUERY_NAMES[@]}" | bc)
overall_speedup=$(echo "scale=2; $unduck_overall / $rebang_overall" | bc)

echo ""
printf "%-20s %12.2f %12.2f %9.2fx\n" "OVERALL AVERAGE" "$rebang_overall" "$unduck_overall" "$overall_speedup"
echo ""
echo "=============================================="
