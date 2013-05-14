test: test-integration

test-integration: node_modules setup-test-environment serve-client run-server
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec || true
	@killall node

node_modules:
	$(MAKE) -C ../server node_modules
	ln -s ../server/node_modules node_modules

setup-test-environment:
	./bin/setup_test_environment.sh

clean-test-db:
	-sudo -u postgres dropdb crypton_test

serve-client:
	$(MAKE) -C ../client
	./node_modules/.bin/http-server -p 8080 ../client &

run-server:
	$(MAKE) -C ../server node_modules
	NODE_ENV=test node ../server/server.js &

.PHONY: test test-integration setup-test-environment clean-test-db serve-client run-server
