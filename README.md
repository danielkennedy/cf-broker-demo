cf-broker-demo
==============
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
export DOCKER_URL=tcp://0.0.0.0:2375
npm start
```

On host running bosh lite:
```
cf api https://api.10.244.0.34.xip.io --skip-ssl-validation
cf auth admin admin
cf create-org me
cf target -o me
cf create-space test
cf target -s test
cf create-service-broker my-demo-broker username password http://192.168.50.4:3000
cf curl /v2/service_plans -X 'GET' | grep \"url\"
cf curl URL_FROM_PREVIOUS_STEP -X 'PUT' -d '{"public":true}'
cf marketplace
cf create-service awesome-sauce free-as-in-beer my-super-awesome-service-instance
cf services
cf push spring-music -i 1 -m 512M -p spring-music.war --no-manifest
cf bind-service spring-music my-super-awesome-service-instance
cf push spring-music -i 1 -m 512M -p spring-music.war --no-manifest
```

On bosh lite vm:
```
sudo su -
docker -H tcp://0.0.0.0:2375 ps
netstat -antp|grep 5432
```

On DEA:
```

```
