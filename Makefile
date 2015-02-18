# Binaries.
browserify = ./node_modules/.bin/browserify
mocha = ./node_modules/.bin/mocha

# Build the browserify bundle.
analytics-node.js: node_modules lib/index.js
	@$(browserify) lib/index.js \
		--standalone Analytics \
		--outfile analytics-node.js

# Install the node module dependencies.
node_modules: package.json
	@npm install
	@touch package.json

# Run the tests.
test: node_modules
	@$(mocha) \
		--reporter spec \
		--bail

clean:
	@rm analytics-node.js

# Phonies.
.PHONY: test
