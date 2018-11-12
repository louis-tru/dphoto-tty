
NODE 	?= node
UNAME ?= $(shell uname)

dttyfs:
	$(NODE) --inspect=0.0.0.0:9225 bin/dttyfs.js

dttyd:
	$(NODE) --inspect=0.0.0.0:9226 bin/dttyd.js test@127.0.0.1

dtty:
	$(NODE) --inspect=0.0.0.0:9227 bin/dtty.js test@127.0.0.1
