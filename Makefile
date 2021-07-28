bootstrap:
	.buildscript/bootstrap.sh

# use yarn scripts for the rest
%:
	@yarn $@

.PHONY: bootstrap
