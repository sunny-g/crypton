all: test

test: check test-unit test-integration

test-unit: test-unit-server test-unit-client

test-unit-server:
	@$(MAKE) -C server test

test-unit-client:
	@$(MAKE) -C client test

test-integration:
	@$(MAKE) -C integration_tests test

full: nuke test

clean:
	@$(MAKE) -C client clean
	@$(MAKE) -C integration_tests clean-test-db

setup:
	@$(MAKE) -C integration_tests setup-test-environment

reset: clean setup

docs:
	@echo "Generating documentation..."
	@npm install -g otis jade
	@sed -i '' -e '1s:node:node --stack_size=4096:' $$(dirname $$(which otis))/$$(readlink $$(which otis))
	@otis .

check:
	@echo "Checking dependencies..."
	@./check_dependencies.sh

nuke:
	@echo "Deleting all node modules..."
	-@rm -rf server/node_modules
	-@rm -rf client/node_modules
	-@rm -rf integration_tests/node_modules

.PHONY: test test-unit test-unit-server test-unit-client test-integration clean setup reset docs check nuke
