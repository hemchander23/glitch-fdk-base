#! /bin/bash

cd  /app/workspace
showdown makehtml -i /app/workspace/README.md -o /app/index.html > /dev/null 2>&1
showdown makehtml -i /app/workspace/readme.md -o /app/index.html > /dev/null 2>&1
pnpm i
node /app/.fdk/fdk/package/index.js run $FDK_ARGS