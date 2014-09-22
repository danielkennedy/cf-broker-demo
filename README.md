cf-broker-demo
==============
## Demo setup

### Prepare the desktop

Need the following windows open:
 1. Browser
 1. "CF Terminal" (local, for cf commands)
 1. "Docker Terminal" Terminal (vagrant, to run docker and mysql)
 1. "Broker Terminal" (vagrant, to run service broker)

### Get bosh lite up and running

In CF Terminal:
```
cd ~/code/bosh-lite-demo
./binscripts/bosh-lite-cloudfoundry-demo
```

### Get docker installed and working
In Docker Terminal:
```
cd ~/bosh-lite-tutorial/bosh-lite
vagrant ssh local
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

## Demo Execution

### Get broker started, registered, and available

In Broker Terminal:
```
cd ~/bosh-lite-tutorial/bosh-lite
vagrant ssh local
git clone https://github.com/danielkennedy/cf-broker-demo
cd cf-broker-demo
npm install
DOCKER_HOST=192.168.50.4 DOCKER_PORT=2375 npm start
```

In CF Terminal:
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
```

### Demonstrate broker functionality

In CF Terminal:
```
cf create-service mysql-docker free mysql
cf services
cf push node-env -i 1 -m 128M --no-manifest
```

In Browser Window:

 1. Navigate to http://node-env.10.244.0.34.xip.io/
 1. Add an album

In Docker Terminal:
```
sudo su -
docker -H tcp://0.0.0.0:2375 ps
docker -H tcp://0.0.0.0:2375 port CONTAINER_ID 3306
netstat -antp|grep EXPOSED_PORT
mysql --host=0.0.0.0 --port=EXPOSED_PORT --user=admin --password=ADMIN_PASSWORD
SHOW DATABASES;
SELECT user from mysql.user;
```

In CF Terminal:
```
cf bind-service node-env mysql
cf push node-env -i 1 -m 128M --no-manifest
```

In Docker Terminal:
```
mysql --host=0.0.0.0 --port=EXPOSED_PORT --database=DB_FROM_CREDS --user=USER_FROM_CREDS --password=PASSWORD_FROM_CREDS
SHOW GRANTS;
```

In CF Terminal:
```
cf services
cf unbind-service node-env mysql
cf services
cf push node-env -i 1 -m 128M --no-manifest
```

In Docker Terminal:
```
mysql --host=0.0.0.0 --port=EXPOSED_PORT --database=DB_FROM_CREDS --user=USER_FROM_CREDS --password=PASSWORD_FROM_CREDS
SHOW GRANTS;
```

In CF Terminal:
```
cf delete-service mysql -f
```

In Docker Terminal:
```
docker -H tcp://0.0.0.0:2375 ps
```
