# Binaries.
browserify = ./node_modules/.bin/browserify
mocha = ./node_modules/.bin/mocha
nsp = ./node_modules/.bin/nsp
standard = ./node_modules/.bin/standard

# Build the browserify bundle.
analytics-node.js: node_modules lib/index.js
	@$(browserify) lib/index.js \
		--standalone Analytics \
		--outfile analytics-node.js

# Install the node module dependencies.
node_modules: yarn.lock
	yarn
	touch $@

# Run the tests.
test: node_modules
	@$(mocha) \
		--reporter spec \
		--bail

lint: node_modules
	$(standard)

clean:
	@rm analytics-node.js

nsp:
	@$(nsp) check

# Phonies.
.PHONY: test lint clean nsp
