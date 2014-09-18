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
apt-get -y install curl postgresql-client
curl -sSL https://get.docker.io/ubuntu/ | sudo sh
docker -v
service docker stop
docker -d -H tcp://0.0.0.0:2375
```

On DEA (AKA "runner"):
```
curl 192.168.50.4:2375/info
```

## Get broker registered and available:
On host running bosh lite:
```
git clone https://github.com/danielkennedy/cf-broker-demo
cd cf-broker-demo
cf api https://api.10.244.0.34.xip.io --skip-ssl-validation
cf auth admin admin
cf create-org me
cf target -o me
cf create-space test
cf target -s test
cf push cf-broker-demo -i 1 -m 128M --no-start
cf set-env cf-broker-demo DOCKER_HOST http://192.168.50.4
cf set-env cf-broker-demo DOCKER_PORT 2375
cf push cf-broker-demo
cf create-service-broker my-demo-broker username password http://cf-broker-demo.10.244.0.34.xip.io
cf curl /v2/service_plans -X 'GET' | grep \"url\"
cf curl URL_FROM_PREVIOUS_STEP -X 'PUT' -d '{"public":true}'
cf marketplace
cf create-service awesome-sauce free-as-in-beer my-super-awesome-service-instance
cf services
```

In bosh lite:
```
```
