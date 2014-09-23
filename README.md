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
# fixup /etc/init/docker.conf: set DOCKER_OPTS="-H tcp://127.0.0.1:2375"
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
DATABASE_HOST=104.131.126.213 DOCKER_HOST=localhost DOCKER_PORT=2375 npm start
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
cf marketplace
cf create-service-broker mysql-docker-broker username password http://104.131.126.213:3000
cf curl /v2/service_plans -X 'GET' | grep \"url\"
cf curl URL_FROM_PREVIOUS_STEP -X 'PUT' -d '{"public":true}'
cf marketplace
```

### Demonstrate broker functionality

In CF Terminal:
```
cd ~/code/dump-env
cf create-service mysql-docker free mysql
cf services
cf push node-env -i 1 -m 128M --no-manifest
```

In Browser Window:

 1. Navigate to http://node-env.10.244.0.34.xip.io/
 1. Notice VCAP_SERVICES is empty

In Docker Terminal:
```
sudo su -
docker -H tcp://localhost:2375 ps
netstat -antp|grep EXPOSED_PORT
```

In CF Terminal:
```
mysql --host=104.131.126.213 --user=admin --port=EXPOSED_PORT --password=ADMIN_PASSWORD
mysql> SHOW DATABASES;
mysql> SELECT user FROM mysql.user;
mysql> exit
cf bind-service node-env mysql
cf push node-env -i 1 -m 128M --no-manifest
mysql --host=104.131.126.213 --port=EXPOSED_PORT --database=DB_FROM_CREDS --user=USER_FROM_CREDS --password=PASSWORD_FROM_CREDS
mysql> SHOW GRANTS;
mysql> exit
```

In Browser Window:

 1. Navigate to http://node-env.10.244.0.34.xip.io/
 1. Notice VCAP_SERVICES is NOT empty

In CF Terminal:
```
cf services
cf unbind-service node-env mysql
cf services
mysql --host=104.131.126.213 --port=EXPOSED_PORT --database=DB_FROM_CREDS --user=USER_FROM_CREDS --password=PASSWORD_FROM_CREDS
mysql> SHOW GRANTS;
mysql> exit
cf delete-service mysql -f
```

In Docker Terminal:
```
docker -H tcp://localhost:2375 ps
```
