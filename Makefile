
NODE 	?= node
UNAME ?= $(shell uname)

ifeq ($(UNAME),Linux)
	ifneq ($(USER),root)
		SUDO = "sudo"
	endif
endif

dttyd:
	$(SUDO) $(NODE) --inspect=0.0.0.0:9225 bin/dttyd.js admin@127.0.0.1 -n test

dtty:
	$(SUDO) $(NODE) --inspect=0.0.0.0:9226 bin/dtty.js admin@127.0.0.1 -n test

dttyfs:
	$(SUDO) $(NODE) --inspect=0.0.0.0:9227 bin/dttyfs.js
