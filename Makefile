
NODE 	?= node
UNAME ?= $(shell uname)

ifeq ($(UNAME),Linux)
	ifneq ($(USER),root)
		SUDO = "sudo"
	endif
endif

dttyd:
	$(SUDO) $(NODE) --inspect=0.0.0.0:9225 bin/dttyd.js test@127.0.0.1

dtty:
	$(SUDO) $(NODE) --inspect=0.0.0.0:9226 bin/dtty.js test@127.0.0.1

dttyfs:
	$(SUDO) $(NODE) --inspect=0.0.0.0:9227 bin/dttyfs.js
