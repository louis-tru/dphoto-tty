
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
	npm i -g --unsafe-perm

install_dttyfs: install
	cp dttyfs.service /lib/systemd/system
	systemctl enable dttyfs
	systemctl daemon-reload

install_dttyd: install
	cp dttyd.service /lib/systemd/system
	systemctl enable dttyd
	systemctl daemon-reload

lc_link = if [ -d $1 ]; then \
						rm node_modules/$(shell basename $1) -rf;\
						ln -s $1 node_modules/$(shell basename $1); \
					fi

install:
	@-npm install --only=prod
	@$(call lc_link,$(NGUI)/node_modules/ngui-utils)
