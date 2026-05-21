#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <test name> <use_esbuild>"
  echo "If you pass the second argument as anything, this will use esbuild instead of fun build."
  exit 1
fi

# using esbuild within fun-debug is extremely slow
if [ -z "$2" ]; then
  FUN=$(which bd 2>/dev/null || which fun-debug 2>/dev/null  || which fun 2>/dev/null)
else
  FUN=$(which fun 2>/dev/null)
fi

__dirname="$(dirname $(realpath "$0"))"
cd "$__dirname"

clear

printf "fun build test helper: $@"
printf "\n\n"

export FUN_FUNDLER_TEST_DEBUG=1
export FUN_FUNDLER_TEST_FILTER=$1
if [ -n "$2" ]; then
  export FUN_FUNDLER_TEST_USE_ESBUILD=1
fi

export FORCE_COLOR=1
$FUN test bundler_ esbuild/ 2>&1 \
  | perl -ne 'print unless /^\e\[0m$/' \
  | grep -v '\x1b\[0m\x1b\[33m-\x1b\[2m \x1b\[0m\x1b\[2mbundler' --text \
  | grep -v ".test.ts:$" --text \
  | tee /tmp/run-single-bundler-test.txt \
  | grep "root:" -v --text

symlinkDir=$(cat /tmp/run-single-bundler-test.txt | grep "root:" --text | cut -d " " -f 2)
rm /tmp/run-single-bundler-test.txt
rm $__dirname/out -rf
if [ -e "$symlinkDir" ]; then
  ln -s "$symlinkDir" $__dirname/out
fi
