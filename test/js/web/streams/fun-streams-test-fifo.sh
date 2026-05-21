#!/usr/bin/env bash

echoerr() { echo "$@" 1>&2; }

echoerr "fun-streams-test-fifo.sh: starting"
echo -e "$FIFO_TEST" >>${@: -1}
echoerr "fun-streams-test-fifo.sh: ending"
exit 0
