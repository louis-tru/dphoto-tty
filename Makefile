
NODE 	?= node
UNAME ?= $(shell uname)
CWD   ?= $(shell pwd)

ifneq ($(USER),root)
	SUDO = "sudo"
endif

.PHONY: dttyd dtty install install_dttyd

dttyd:
	$(NODE) --inspect=0.0.0.0:9226 dttyd.js -id test -h 127.0.0.1

dtty:
	$(NODE) --inspect=0.0.0.0:9227 dtty.js test@127.0.0.1

install:
	npm install --unsafe-perm
	$(SUDO) npm i -g --unsafe-perm

install_dttyd: install
	cp dttyd.service /lib/systemd/system
	$(SUDO) systemctl enable dttyd
	$(SUDO) systemctl daemon-reload
