#!/bin/bash

# Benchmark: Bang vs ReBang vs Unduck
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
echo "  Bang vs ReBang vs Unduck Benchmark"
echo "=============================================="
echo ""
echo "Iterations per query: $ITERATIONS"
echo "Date: $(date)"
echo ""

# Arrays to store all results
declare -a BANG_AVGS
declare -a REBANG_AVGS
declare -a UNDUCK_AVGS

for i in "${!QUERIES[@]}"; do
  query="${QUERIES[$i]}"
  name="${QUERY_NAMES[$i]}"
  
  echo "Testing: $name"
  echo "  Query: $query"
  
  # Benchmark Bang
  bang_total=0
  for j in $(seq 1 $ITERATIONS); do
    time=$(curl -w "%{time_total}" -s -o /dev/null -I "https://bang.kobeerose.workers.dev/?q=$query")
    bang_total=$(echo "$bang_total + $time" | bc)
  done
  bang_avg=$(echo "scale=4; $bang_total / $ITERATIONS * 1000" | bc)
  BANG_AVGS+=("$bang_avg")

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
  
  # Calculate improvement vs ReBang
  if (( $(echo "$rebang_avg > 0" | bc -l) )); then
    bang_vs_rebang=$(echo "scale=2; $bang_avg / $rebang_avg" | bc)
    unduck_vs_rebang=$(echo "scale=2; $unduck_avg / $rebang_avg" | bc)
  else
    bang_vs_rebang="N/A"
    unduck_vs_rebang="N/A"
  fi
  
  echo "  Bang:    ${bang_avg}ms avg"
  echo "  ReBang:  ${rebang_avg}ms avg"
  echo "  Unduck:  ${unduck_avg}ms avg"
  echo "  Bang vs ReBang:   ${bang_vs_rebang}x"
  echo "  Unduck vs ReBang: ${unduck_vs_rebang}x"
  echo ""
done

echo "=============================================="
echo "  SUMMARY"
echo "=============================================="
echo ""
printf "%-20s %12s %12s %12s %12s\n" "Bang" "Bang (ms)" "ReBang (ms)" "Unduck (ms)" "Fastest"
printf "%-20s %12s %12s %12s %12s\n" "----" "---------" "-----------" "-----------" "-------"

bang_grand_total=0
rebang_grand_total=0
unduck_grand_total=0

for i in "${!QUERY_NAMES[@]}"; do
  name="${QUERY_NAMES[$i]}"
  bang="${BANG_AVGS[$i]}"
  rebang="${REBANG_AVGS[$i]}"
  unduck="${UNDUCK_AVGS[$i]}"
  
  bang_grand_total=$(echo "$bang_grand_total + $bang" | bc)
  rebang_grand_total=$(echo "$rebang_grand_total + $rebang" | bc)
  unduck_grand_total=$(echo "$unduck_grand_total + $unduck" | bc)

  fastest="Bang"
  fastest_value="$bang"
  if (( $(echo "$rebang < $fastest_value" | bc -l) )); then
    fastest="ReBang"
    fastest_value="$rebang"
  fi
  if (( $(echo "$unduck < $fastest_value" | bc -l) )); then
    fastest="Unduck"
    fastest_value="$unduck"
  fi

  printf "%-20s %12.2f %12.2f %12.2f %12s\n" "$name" "$bang" "$rebang" "$unduck" "$fastest"
done

bang_overall=$(echo "scale=2; $bang_grand_total / ${#QUERY_NAMES[@]}" | bc)
rebang_overall=$(echo "scale=2; $rebang_grand_total / ${#QUERY_NAMES[@]}" | bc)
unduck_overall=$(echo "scale=2; $unduck_grand_total / ${#QUERY_NAMES[@]}" | bc)

overall_fastest="Bang"
overall_fastest_value="$bang_overall"
if (( $(echo "$rebang_overall < $overall_fastest_value" | bc -l) )); then
  overall_fastest="ReBang"
  overall_fastest_value="$rebang_overall"
fi
if (( $(echo "$unduck_overall < $overall_fastest_value" | bc -l) )); then
  overall_fastest="Unduck"
  overall_fastest_value="$unduck_overall"
fi

echo ""
printf "%-20s %12.2f %12.2f %12.2f %12s\n" "OVERALL AVERAGE" "$bang_overall" "$rebang_overall" "$unduck_overall" "$overall_fastest"
echo ""
echo "Relative to ReBang:"
if (( $(echo "$rebang_overall > 0" | bc -l) )); then
  bang_ratio=$(echo "scale=2; $bang_overall / $rebang_overall" | bc)
  unduck_ratio=$(echo "scale=2; $unduck_overall / $rebang_overall" | bc)

  if (( $(echo "$bang_ratio >= 1" | bc -l) )); then
    echo "  Bang: ${bang_ratio}x slower"
  else
    bang_faster=$(echo "scale=2; $rebang_overall / $bang_overall" | bc)
    echo "  Bang: ${bang_faster}x faster"
  fi

  echo "  ReBang: 1.00x baseline"

  if (( $(echo "$unduck_ratio >= 1" | bc -l) )); then
    echo "  Unduck: ${unduck_ratio}x slower"
  else
    unduck_faster=$(echo "scale=2; $rebang_overall / $unduck_overall" | bc)
    echo "  Unduck: ${unduck_faster}x faster"
  fi
fi

echo "=============================================="
