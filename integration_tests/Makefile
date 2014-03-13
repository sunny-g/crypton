test: test-integration

test-integration: node_modules clean-test-db setup-test-environment build-client run-server
	@NODE_ENV=test ./node_modules/.bin/phantomjs --ignore-ssl-errors=true ./node_modules/mocha-phantomjs/lib/mocha-phantomjs.coffee test/index.html

node_modules:
	$(MAKE) -C ../server node_modules
	npm install

setup-test-environment:
	./bin/setup_test_environment.sh

clean-test-db:
	-sudo -u postgres dropdb crypton_test

build-client:
	$(MAKE) -C ../client compile

run-server:
	@echo "Killing any existing Crypton servers..."
	sudo killall node || true
	$(MAKE) -C ../server node_modules
	NODE_ENV=test node ../server/bin/cli.js -c config.json &

loop:
	until ! make; do :; done

.PHONY: test test-integration setup-test-environment clean-test-db build-client run-server loop
