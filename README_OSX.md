# Crypton : Mac OS X Install instructions

## About
These instructions are from my notes on trying to use the Crypton client examples and test Server on an Apple Mac OS X machine.  These tests were run on a system running Yosemite (10.10.5) and dependencies were installed using the latest versions available from Homebrew at the time this was authored (9/2015).

# Getting started


### Clone Crypton

Clone a local copy of Crypton. Replace `~\src` with your own preferred source code directory.

````
cd ~/src
git clone https://github.com/SpiderOak/crypton.git
cd crypton
````

### Install Postgres using [Homebrew](http://brew.sh)

````
brew install postgresql
````

After installation follow the instructions to copy the launchd plist file and setup to launch postgres at boot time.


#### Create a new `postgres` database user using the [createuser](https://github.com/SpiderOak/crypton/wiki/Postgresql-notes) command.


````
createuser -s -r postgres
````

### Install Nodejs using [nvm](https://github.com/creationix/nvm)

See the [nvm](https://github.com/creationix/nvm) website for detailed instructions. Crypton currently strictly expects Nodejs version `0.12.x` to be installed (which is no longer the current stable version).

````
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.26.1/install.sh | bash

nvm install 0.12.7
````

Add an `.nvmrc` file to the `crypton` dir and add the following content:

````
v0.12.7
````

Enable correct node version when you enter the crypton dir by typing `nvm use` which will reference the `.nvmrc` file and setup the correct version of `node` and `npm`.

You need to do this ***every*** time you `cd` into the crypton dir.


Verify your `node` installation:

````
$ which node
/Users/YOURUSERNAME/.nvm/versions/node/v0.12.7/bin/node

$ which npm
/Users/YOURUSERNAME/.nvm/versions/node/v0.12.7/bin/npm
````

### Install `redis` using [Homebrew](http://brew.sh)

````
brew install redis
````

After installation follow instructions to copy the launchd plist file and setup to launch at boot time.

### Test that all Crypton dependencies are installed

````
./check_dependencies.sh
````

If the output is OK then continue on.


### Build the Crypton client

````
cd client
npm install
./compile.sh --once
````

Compile will place crypton.js in `crypton/client/dist/crypton.js`, use this file in your client application.


### Build the Crypton Server

The init command creates `crypton_test_user` user, `crypton_test` DB and appropriate DB schema in Postgres.

````
cd ../server/
npm install
npm link
bin/cli.js db:init
````

### Run the Crypton Server

Option A) Run in the foreground. The default server configuration can be found in `crypton/server/config/config.test.json`

````
bin/cli.js run
````

Option B) Run in the background

````
sudo bin/cli.js start
sudo bin/cli.js status
````

Verify server is running with curl (if needed in `insecure` mode which skips self-signed certificate checks)

````
curl --insecure -i https://localhost:1025
````

Stop the server

````
sudo bin/cli.js stop
````

(Optional) cleanup : if you want to drop the DB user and DB at some point later. Drops `crypton_test_user` user, `crypton_test` DB and DB schema

````
bin/cli.js db:drop
````

Test a sample application

````
cd ../client/examples/items/
sudo crypton-server start
````

Open your browser to the URL [https://localhost:1025/](https://localhost:1025/) and register a new account via the form. Since the server uses a self-signed certificate by default you may need to instruct your browser to accept and trust this `localhost` only certificate. You can find the instructions for Safari [here](http://blog.marcon.me/post/24874118286/secure-websockets-safari).

Once you are registered and logged in, open the JS console in your browser. See the original version of these instructions [here](https://github.com/SpiderOak/crypton/wiki/Quick-Start-&-Items-API:-%5BBETA-docs%5D).  The following is just a quick smoke-test that things are working as expected. You should continue to the Crypton docs for more info and examples.

This creates an empty Item called 'myitem'

````
app.session.getOrCreateItem('myitem', function callback(err, item) {console.log(arguments)});
````

Add values to this Item. This will save the item immediately, no callback required.

````
app.session.items.myitem.value = {foo: 1, bar: 2};
````
