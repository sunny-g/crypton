#!/bin/bash

# cross-platform way to grab this script's directory
pushd `dirname $0` > /dev/null
SCRIPT_PATH=`pwd -P`
popd > /dev/null
UGLIFY_PATH="$SCRIPT_PATH/node_modules/uglify-js/bin/uglifyjs"

has_md5 () {
  for PROG in md5 md5sum; do
    if which $PROG >/dev/null 2>&1; then
       MD5=$PROG
       break
    fi
  done

  if [[ -z $MD5 ]]; then
    echo "No suitable MD5 program found; install one of md5 or md5sum"
    exit 1
  fi
}

has_uglify () {
  if [ ! -f $UGLIFY_PATH ]; then
    if [ $1 ]; then
      echo "Uglifyjs installation failed. Please install it manually."
      exit 1
    fi

    echo "Uglifyjs not found. Attempting to install it..."
    cd $SCRIPT_PATH
    npm install &> /dev/null
    has_uglify 1
  fi
}

daemon () {
  chsum1=""

  while [[ true ]]
  do
    chsum2=`find src/ -type f -exec $MD5 {} \;`
    if [[ $chsum1 != $chsum2 ]] ; then           
      compile
      chsum1=`find src/ -type f -exec $MD5 {} \;`
      echo "Watching..."
    fi
    sleep 2
  done
}

compile () {
  echo "Compiling client code to crypton.js..."
  mkdir -p dist
  cat \
    src/core.js \
    src/account.js \
    src/session.js \
    src/container.js \
    src/transaction.js \
    src/peer.js \
    src/message.js \
    src/inbox.js \
    src/diff.js \
    src/work.js \
    src/card.js \
    src/item.js \
    src/errors.js \
    src/vendor/*.js \
    > dist/crypton.js
  $UGLIFY_PATH dist/crypton.js > dist/crypton.min.js
}

case $1 in
  --once)
    has_uglify
    compile
    ;;
  *)
    has_md5
    has_uglify
    daemon
    ;;
esac
