# baikal-manager

(auto profit switching) baikal monitoring and configuration deployment software

can use nicehash via https://github.com/felixbrucker/profitability-service or run standalone without switching

### Screens

![Stats](/screens/stats.png?raw=true "Stats")
![Config](/screens/config.PNG?raw=true "Config")


### Prerequisites

baikal-manager requires nodejs, npm and optionally pm2 to run.

for now you will need to remove the auth/session authorization in /var/www/f_settings.php and /var/www/f_status.php on all baikal miners you want to add.


### Installation

```sh
git clone https://github.com/felixbrucker/baikal-manager
cd baikal-manager
npm install
npm install pm2 -g
```

### Run

```sh
pm2 start process.json
```

or

```sh
npm start
```

to startup on boot:

```sh
pm2 save
pm2 startup
```

note: windows users need the following instead for pm2:

```sh
npm install pm2-windows-startup -g
pm2-startup install
pm2 save
```

or just modify startTemplate.bat file to match your preferred compile and save as start.bat to not interfere with git updates

### Update software

run ``` git pull ```

### Todos

 - Error handling
 - Properly use async Methods
 - Properly send responses to indicate the result to frontend
 - Add Code Comments
 - Write Tests


License
----

GNU GPLv3 (see LICENSE)
