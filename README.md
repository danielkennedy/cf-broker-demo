cf-broker-demo
==============
## Demo setup:
1. Browser
1. Terminal (local, for cf commands)
1. Terminal (vagrant, to run docker and mysql)
1. Terminal (vagrant, to run service broker)

## Get docker installed and working
On host running bosh lite:
```
cd ~/bosh-lite
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
docker -H tcp://localhost:2375 pull mysql:latest
```

## Get broker registered and available:
On host running bosh lite:
```
cd ~/bosh-lite
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
cf api https://api.10.244.0.34.xip.io --skip-ssl-validation
cf auth admin admin
cf create-org me
cf target -o me
cf create-space test
cf target -s test
cf push spring-music -i 1 -m 512M -p spring-music.war --no-manifest
cf create-service-broker mysql-docker-broker username password http://192.168.50.4:3000
cf curl /v2/service_plans -X 'GET' | grep \"url\"
cf curl URL_FROM_PREVIOUS_STEP -X 'PUT' -d '{"public":true}'
cf marketplace
cf create-service mysql-docker free mysql-music
cf services
cf bind-service spring-music mysql-music
cf push spring-music -i 1 -m 512M -p spring-music.war --no-manifest
```

In browser
1. Navigate to http://spring-music.10.244.0.34.xip.io/
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
cf unbind-service spring-music mysql-music
cf services
cf push spring-music -i 1 -m 512M -p spring-music.war --no-manifest
cf delete-service mysql-music -f
```
## Node/MySQL Stuff:
```
node
> var mysql=require('mysql');
> var connection = mysql.createConnection({host:'0.0.0.0',port:55311,user:'admin',password:'d064e635-042a-431e-b0f7-7d0be1790eba',database:''});
> connection.connect(function(err){if(err){console.error('failed', err);}});
> connection.query('CREATE DATABASE newdatabase', function(err, rows, fields) {connection.end();console.log('CREATE DATABASE:', err, rows, fields);if (!err) {console.log('CREATED DATABASE');}});
```
