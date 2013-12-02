#!/bin/bash

if [[ -e deb/redis ]]; then 
    rm -rf deb/redis
fi
mkdir -p deb/redis
cd deb/redis
apt-get source -b redis-server
#DEBIAN_FRONTEND=noninteractive dpkg -i *.deb
