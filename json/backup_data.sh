#!/bin/bash

name="infectors"
ext="json"
n=0
t="$(date '+%Y%m%d')"

dst=${name}_${t}.${ext}
# shellcheck disable=SC2010
while ls log | grep -w "$dst" >/dev/null; do
  n=$((n + 1))
  dst=${name}_${t}_${n}.${ext}
done

mkdir -p log
cp ${name}.${ext} log/"${dst}"
