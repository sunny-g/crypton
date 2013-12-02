#!/bin/bash

set -e
set -x

NODEJS_VERSION="$1"

if [[ -x /usr/local/bin/node ]]; then
    exit 0
fi

if [[ ! -d ~/src ]]; then
    mkdir ~/src
fi

cd ~/src

if [[ ! -d node ]]; then
    git clone https://github.com/joyent/node.git \
        --branch ${NODEJS_VERSION:?}-release
    cd node
    git checkout ${NODEJS_VERSION:?}-release
else
    cd node
    git clean -df
    git pull --rebase
    git checkout ${NODEJS_VERSION:?}-release
fi

./configure
make
sudo make install
