all: test

test: check test-unit test-integration

test-unit: test-unit-server test-unit-client

test-unit-server:
	@$(MAKE) -C server test

test-unit-client:
	@$(MAKE) -C client test

test-integration:
	@$(MAKE) -C test test

full: nuke test

clean:
	@$(MAKE) -C client clean
	@$(MAKE) -C test clean-test-db

setup:
	@$(MAKE) -C test setup-test-environment

reset: clean setup

doc:
	@echo "Installing documentation generator dependencies..."
	@pip install pygments &> /dev/null
	@echo "Installing node modules for documentation..."
	@npm uninstall -g otis jade@0.x &> /dev/null
	@npm install -g otis jade@0.x http-server &> /dev/null
	@echo "Applying hack to documentation generator..."
	@sed -i '' -e '1s:node:node --stack_size=4096:' $$(dirname $$(which otis))/$$(readlink $$(which otis))
	@echo "Generating documentation..."
	@otis .
	@echo "Opening documentation..."
	@open doc/index.html

check:
	@echo "Checking dependencies..."
	@./check_dependencies.sh

nuke:
	@echo "Deleting all node modules..."
	-@rm -rf server/node_modules
	-@rm -rf client/node_modules
	-@rm -rf test/node_modules

loop: nuke
	@echo "Looping all tests until failure..."
	@until ! make; do :; done

.PHONY: test test-unit test-unit-server test-unit-client test-integration clean setup reset doc check nuke
