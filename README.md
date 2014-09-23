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
cf create-service mysql-docker free mysql
cf services
cd ~/code/spring-music
cf push spring-music -i 1 -m 512M -p spring-music.war --no-manifest
```

In Browser Window:

 1. Navigate to http://spring-music.10.244.0.34.xip.io/
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
cf bind-service spring-music mysql
cf push spring-music -i 1 -m 512M -p spring-music.war --no-manifest
mysql --host=104.131.126.213 --port=EXPOSED_PORT --database=DB_FROM_CREDS --user=USER_FROM_CREDS --password=PASSWORD_FROM_CREDS
mysql> SHOW GRANTS;
mysql> exit
```

In Browser Window:

 1. Navigate to http://spring-music.10.244.0.34.xip.io/
 1. Notice VCAP_SERVICES is NOT empty
 1. Add an album (1984?)

In CF Terminal:
```
mysql --host=104.131.126.213 --port=EXPOSED_PORT --database=DB_FROM_CREDS --user=USER_FROM_CREDS --password=PASSWORD_FROM_CREDS
mysql> SHOW TABLES;
mysql> SELECT * FROM Album;
mysql> SELECT * FROM Album WHERE title = '1984';
mysql> exit
```

In Browser Window:

 1. Navigate to http://spring-music.10.244.0.34.xip.io/
 1. Delete an album (1984?)

In CF Terminal:
```
mysql --host=104.131.126.213 --port=EXPOSED_PORT --database=DB_FROM_CREDS --user=USER_FROM_CREDS --password=PASSWORD_FROM_CREDS
mysql> SELECT * FROM Album WHERE title = '1984';
mysql> exit
cf services
cf unbind-service spring-music mysql
cf services
mysql --host=104.131.126.213 --port=EXPOSED_PORT --database=DB_FROM_CREDS --user=USER_FROM_CREDS --password=PASSWORD_FROM_CREDS
mysql> SHOW GRANTS;
mysql> SHOW TABLES;
mysql> exit
cf delete-service mysql -f
```

In Docker Terminal:
```
docker -H tcp://localhost:2375 ps
```
