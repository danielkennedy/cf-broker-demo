cf-broker-demo
==============
## Demo setup:

Need the following windows open:
 1. Browser
 1. "CF Terminal" (local, for cf commands)
 1. "Docker Terminal" Terminal (vagrant, to run docker and mysql)
 1. "Broker Terminal" (vagrant, to run service broker)

## Get bosh lite up and running
```
cd ~/code/bosh-lite-demo
./binscripts/bosh-lite-cloudfoundry-demo
```

## Get docker installed and working
On host running bosh lite:
```
cd ~/bosh-lite-tutorial/bosh-lite
vagrant ssh local
```

On bosh lite VM:
```
sudo su -
curl -sL https://deb.nodesource.com/setup | bash -
apt-get -y install curl mysql-client git-core nodejs
curl -sSL https://get.docker.io/ubuntu/ | sudo sh
docker -v
service docker stop
# fixup /etc/init/docker.conf: set DOCKER_OPTS="-H tcp://0.0.0.0:2375"
service docker start
# prestage the mysql image
docker -H tcp://localhost:2375 pull tutum/mysql:latest
```

## Get broker registered and available:
On host running bosh lite:
```
cd ~/bosh-lite-tutorial/bosh-lite
vagrant ssh local
```

On bosh lite VM:
```
git clone https://github.com/danielkennedy/cf-broker-demo
cd cf-broker-demo
npm install
DOCKER_HOST=192.168.50.4 DOCKER_PORT=2375 npm start
```

On host running bosh lite:
```
cd ~/code/dump-env
cf api https://api.10.244.0.34.xip.io --skip-ssl-validation
cf auth admin admin
cf create-org me
cf target -o me
cf create-space test
cf target -s test
cf create-service-broker mysql-docker-broker username password http://192.168.50.4:3000
cf curl /v2/service_plans -X 'GET' | grep \"url\"
cf curl URL_FROM_PREVIOUS_STEP -X 'PUT' -d '{"public":true}'
cf marketplace
cf create-service mysql-docker free mysql
cf services
cf push node-env -i 1 -m 128M --no-manifest
cf bind-service node-env mysql
cf push node-env -i 1 -m 128M --no-manifest
```

In browser
1. Navigate to http://node-env.10.244.0.34.xip.io/
1. Add an album

On bosh lite vm:
```
sudo su -
docker -H tcp://0.0.0.0:2375 ps
docker -H tcp://0.0.0.0:2375 port CONTAINER_ID 3306
netstat -antp|grep EXPOSED_PORT
mysql --host=0.0.0.0 --port=EXPOSED_PORT --database=DB_FROM_CREDS --user=USER_FROM_CREDS --password=PASSWORD_FROM_CREDS
SHOW TABLES;

```

On host running bosh lite:
```
cf services
cf unbind-service node-env mysql
cf services
cf push node-env -i 1 -m 128M --no-manifest
cf delete-service mysql -f
```
## Node/MySQL Stuff:
```
node
> var mysql=require('mysql');
> var connection = mysql.createConnection({host:'0.0.0.0',port:55311,user:'admin',password:'d064e635-042a-431e-b0f7-7d0be1790eba',database:''});
> connection.connect(function(err){if(err){console.error('failed', err);}});
> connection.query('CREATE DATABASE newdatabase', function(err, rows, fields) {connection.end();console.log('CREATE DATABASE:', err, rows, fields);if (!err) {console.log('CREATED DATABASE');}});
```
