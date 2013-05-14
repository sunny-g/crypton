test: test-integration

test-integration: node_modules setup-test-environment build-client run-server
	@NODE_ENV=test ./node_modules/.bin/mocha-phantomjs test/index.html || true
	@killall node

node_modules:
	$(MAKE) -C ../server node_modules
	npm install

setup-test-environment:
	./bin/setup_test_environment.sh

clean-test-db:
	-sudo -u postgres dropdb crypton_test

build-client:
	$(MAKE) -C ../client

run-server:
	$(MAKE) -C ../server node_modules
	NODE_ENV=test node ../server/server.js &

.PHONY: test test-integration setup-test-environment clean-test-db build-client run-server
