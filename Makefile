
node_modules: package.json
	@npm install

test: node_modules
	@node test/index.js

.PHONY: test
