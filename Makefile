
NODE 	?= node
UNAME ?= $(shell uname)

.PHONY: dttyfs dttyd dtty install install_dttyfs install_dttyd

dttyfs:
	$(NODE) --inspect=0.0.0.0:9225 dttyfs.js

dttyd:
	$(NODE) --inspect=0.0.0.0:9226 dttyd.js -d test -h 127.0.0.1

dtty:
	$(NODE) --inspect=0.0.0.0:9227 dtty.js test@127.0.0.1

install:
	npm i -g

install_dttyfs: install
	cp dttyfs.service /lib/systemd/system
	systectl enable dttyfs

install_dttyd: install
	cp dttyd.service /lib/systemd/system
	systectl enable dttyd
