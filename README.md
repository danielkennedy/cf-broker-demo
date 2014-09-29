cf-broker-demo
==============

This simple node app is designed to illustrate the simplicity, flexibility, and
power of [Cloud Foundry](http://cloudfoundry.org/)'s service broker 
[architecture](http://docs.cloudfoundry.org/services/api.html).
The service backend is the [Docker remote API](https://docs.docker.com/reference/api/docker_remote_api/)
and, for the purposes of this demo, uses a simple [MySQL image](https://registry.hub.docker.com/u/tutum/mysql/).

## Disclaimer

This is not a production-ready service broker. It is a working example for demo purposes.
It does completely satisfy Cloud Foundry's Service Broker API, but should be used for
experimentation.  There are no unit (nor integration) tests, hard-coded values, unhandled 
failure points, etc. See the roadmap below for more info.

## Installation

This is, again a very simple example. For the purposes of these instructions, I'll outline
what I've done in working demos. You can stray as far as you are comfortable from these 
instructions and, after a few simple tweaks, should be up and running on any environment
you need. You really only need three things to make this work:

 1. Cloud Foundry
 1. This service broker
 1. Docker

### Docker Setup

I spun up a VM on [Digital Ocean](https://www.digitalocean.com/), but you can run the daemon
anywhere you have a Linux distro or [Boot2Docker](https://github.com/boot2docker/boot2docker) on a Mac.
The key consideration is whether the service broker and any applications that eventually bind
to your services can communicate with the docker daemon. Routing, firewalling, and security are
outside the scope of this example.

Key Considerations:

 - I setup Docker to run as a remote API (TCP vs Unix sockets)
 - You'll want to prestage the mysql image or the first `cf create service` will timeout :-)

Assuming you're running Ubuntu:
```
curl -sSL https://get.docker.io/ubuntu/ | sudo sh
service docker stop
# fixup /etc/init/docker.conf: set DOCKER_OPTS="-H tcp://0.0.0.0:2375"
service docker start
# prestage the mysql image
docker -H tcp://localhost:2375 pull tutum/mysql:latest
```

### Broker Setup

As with the Docker host, you can run the service broker anywhere you want, as long as
Cloud Foundry's Cloud Controller can reach it. I ran the demo with the broker running
on the Docker host, then did it again with the broker running as an app in Cloud Foundry.

Key Considerations:

 - The `DOCKER_HOST` env variable could be `localhost` or `127.0.0.1` if the broker was running alongside docker (on the same machine)

Assuming you're running the broker as a CF app:
```
git clone https://github.com/danielkennedy/cf-broker-demo
cd cf-broker-demo
cf push mysql-docker-broker -i 2 -m 128M --no-start
cf set-env mysql-docker-broker DATABASE_HOST <IP address of docker host>
cf set-env mysql-docker-broker DOCKER_HOST <IP address of docker host>
cf set-env mysql-docker-broker DOCKER_PORT 2375
cf start mysql-docker-broker
```

### Cloud Foundry Setup

Now that Docker and the broker are running, we just have to register the broker with the Cloud Controller.
If you run into issues getting the broker registered, the 
[docs](http://docs.pivotal.io/pivotalcf/services/managing-service-brokers.html) are actually quite helpful.

```
cf create-service-broker mysql-docker-broker USER PASSWD BROKER_URL
cf curl /v2/service_plans -X 'GET' | grep \"url\"
cf curl URL_FROM_PREVIOUS_STEP -X 'PUT' -d '{"public":true}'
cf marketplace
```

## Roadmap (Fork and Innovate) 

This example app only goes so far. The possibilities are limitless. A few of the ideas kicked around at the last live demo:

 1. There is no auth in this example whatsoever. It'd be crazy easy to add, but was outside the scope of the original demo.
 1. The port numbers that are exposed on the Docker host are assigned incrementally with no reuse. A port registry would probably be helpful.
 1. This example only works with MySQL, and that's hard-coded.
 1. It would be easy enough to extend this code to add additional images as either services or plans under a single service.
 1. The Docker Remote API calls made by this example broker assume a single endpoint. That won't scale.
 1. We had a great idea submitted to use the create or bind step as a hook to automate backups of the containers via Docker's cloning functionality.

The sky is the limit, really. That's the cool thing about software :-)
