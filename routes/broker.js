var request = require('request');
var express = require('express');
var uuid = require('node-uuid');
var mysql = require('mysql');
var router = express.Router();

var dockerHost = process.env.DOCKER_HOST;
var dockerPort = process.env.DOCKER_PORT;
var dockerUrl = 'http://' + dockerHost + ':' + dockerPort;

var instances = {
/*
  instances: {
    bindings: {}, // binding_guid-to-app_guid association
  }, // instance_guid-to-docker_guid association
*/
}

var service_guid = uuid.v4();
var free_plan_guid = uuid.v4();

function getRandomPort() {
  var min = 50001;
  var max = 59999;
  return Math.floor(Math.random()*(max-min+1)+min);
}

function dockerCreate(callback) {
  var adminPassword = uuid.v4();
  request.post(dockerUrl + '/containers/create', {
    json: {
      "Hostname":"",
      "Domainname": "",
      "User":"",
      "Memory":0,
      "MemorySwap":0,
      "CpuShares":null,
      "Cpuset": "0,1",
      "AttachStdin":false,
      "AttachStdout":true,
      "AttachStderr":true,
      "PortSpecs":null, // FIXME: make a random port available (something over 50k)
      "Tty":false,
      "OpenStdin":false,
      "StdinOnce":false,
      "Env":[
        "MYSQL_PASS=" + adminPassword
      ],
      "Cmd":[],
      "Image":"tutum/mysql",
      "Volumes":{},
      "WorkingDir":null,
      "NetworkDisabled": false,
      "ExposedPorts":{
        "3306/tcp": {}
      }
    }
  }, function (err, response, body) {
    console.log('DOCKER CREATE:', err, response, body);
    if (!err) {
      console.log('DOCKER CREATED IMAGE', body.Id, 'with PASSWORD', adminPassword);
    }
    callback(err, {
      adminPassword: adminPassword,
      containerId: body.Id
    });
  });
}

function dockerStart(options, callback) {
  var exposedPort = getRandomPort();
  var containerId = options.containerId;
  request.post(dockerUrl + '/containers/' + containerId + '/start', {
    "HostConfig": {
        "Binds": null,
        "CapAdd": null,
        "CapDrop": null,
        "ContainerIDFile": "",
        "Devices": null,
        "Dns": null,
        "DnsSearch": null,
        "Links": null,
        "LxcConf": null,
        "NetworkMode": "",
        "PortBindings": {"3306/tcp":[{ "HostPort": "11022" }]},
        "Privileged": false,
        "PublishAllPorts": true,
        "RestartPolicy": {
            "MaximumRetryCount": 0,
            "Name": ""
        },
        "VolumesFrom": null
    }
/*
    "PublishAllPorts": true
    "PortBindings": {
      "3306": [{
        "HostPort": exposedPort.toString()
      }]
    }
*/
  }, function (err, response, body) {
    console.log('DOCKER START:', err, response, body);
    if (!err) {
      console.log('DOCKER STARTED IMAGE', containerId, 'with EXPOSEDPORT', exposedPort);
    }
    callback(err, {
      exposedPort: exposedPort
    });
  });
}

function dockerStop(options, callback) {
  var containerId = options.containerId;
  request.post(dockerUrl + '/containers/' + containerId + '/stop', function (err, response, body) {
    console.log('DOCKER STOP:', err, response, body);
    if (!err) {
      console.log('DOCKER STOPPED IMAGE', containerId);
    }
    callback(err, {});
  });
}

function dockerRemove(options, callback) {
  var containerId = options.containerId;
  request.del(dockerUrl + '/containers/' + containerId, function (err, response, body) {
    console.log('DOCKER REMOVE:', err, response, body);
    if (!err) {
      console.log('DOCKER REMOVED IMAGE', containerId);
    }
    callback(err, {});
  });
}

function createDatabase(options, callback) {
  var adminPassword = options.adminPassword;
  var databaseName  = uuid.v4();
  var connection = mysql.createConnection({
    host     : dockerHost,
    user     : 'admin',
    password : adminPassword
  });

  connection.connect();

  connection.query('CREATE DATABASE ' + databaseName, function(err, rows, fields) {
    connection.end();
    console.log('CREATE DATABASE:', err, rows, fields);
    if (!err) {
      console.log('CREATED DATABASE', databaseName);
    }
    callback(err, {
      databaseName: databaseName
    });
  });
}

/* cf marketplace */
router.get('/catalog', function(req, res) {
  res.status(200).json({
    services: [{
      id: service_guid,
      name: 'awesome-sauce',
      description: 'This is where the magic happens',
      bindable: true,
      plans: [{
        id: free_plan_guid,
        name: 'free-as-in-beer',
        description: 'The best things in life are free'
      }]
    }]
  });
});

/*
STATUS CODE DESCRIPTION
201 Created Service instance has been created. The expected response body is below.
409 Conflict  Shall be returned if the requested service instance already exists. The expected response body is “{}”
200 OK  May be returned if the service instance already exists and the requested parameters are identical to the existing service instance. The expected response body is below.
*/
/* cf create-service */
router.put('/service_instances/:id', function(req, res) {
  var dashboard_url = 'http://pivotal.io';
  console.log('BODY', req.body);
  console.log('PARAMS', req.params);
  var instanceId = req.params.id;

  // FIXME: create container, start container

  // Check to see if the requested service instance already exists
  if (instances[instanceId]) {
    res.status(409).json({});
  } else {
    console.log('Attempting to create docker:', dockerUrl + '/containers/create');
    dockerCreate(function (err, result) {
      if (err) {
        console.error('DOCKER CREATE ERROR:', err, result);
        res.status(500).json({
          error: err
        });
      } else {
        var containerId = result.containerId;
        var adminPassword = result.adminPassword;
        // Now that it's created, RUN it!
        dockerStart(result, function (err, result) {
          if (err) {
            console.error('DOCKER START ERROR:', err);
            res.status(500).json({
              error: err
            });
          } else {
            var exposedPort = result.exposedPort;
            // store the docker ID associated with this instance ID
            instances[instanceId] = {
              containerId: containerId,
              username: 'admin',
              password: adminPassword,
              host: dockerHost,
              port: exposedPort,
              bindings: {}
            };
            res.status(201).json({
              dashboard_url: dashboard_url
            });
          }
        });
      }
    });
  }
});

/* cf delete-service */
/*
STATUS CODE DESCRIPTION
200 OK  Service instance was deleted. The expected response body is “{}”
410 Gone  Shall be returned if the service instance does not exist. The expected response body is “{}”
*/
router.delete('/service_instances/:id', function(req, res) {
  console.log('BODY', req.body);
  console.log('PARAMS', req.params);
  var instanceId = req.params.id;
  if (instances[instanceId]) {
    var containerId = instances[instanceId].containerId;
    dockerStop(instances[instanceId], function (err, result) {
      if (err) {
        console.error('DOCKER STOP ERROR:', err);
        res.status(500).json({
          error: err
        });
      } else {
        dockerRemove(instances[instanceId], function (err, result) {
          if (err) {
            console.error('DOCKER REMOVE ERROR:', err);
            res.status(500).json({
              error: err
            });
          } else {
            delete instances[instanceId];
            res.status(200).json({});
          }
        });
      }
    });
  } else {
    res.status(410).json({});
  }
});

/*
REQUEST FIELD TYPE  DESCRIPTION
service_id* string  ID of the service from the catalog. While not strictly necessary, some brokers might make use of this ID.
plan_id*  string  ID of the plan from the catalog. While not strictly necessary, some brokers might make use of this ID.
app_guid* string  GUID of the application that you want to bind your service to.

STATUS CODE DESCRIPTION
201 Created Binding has been created. The expected response body is below.
409 Conflict  Shall be returned if the requested binding already exists. The expected response body is “{}”
200 OK  May be returned if the binding already exists and the requested parameters are identical to the existing binding. The expected response body is below.

RESPONSE FIELD  TYPE  DESCRIPTION
credentials object  A free-form hash of credentials that the bound application can use to access the service. For more information, see Binding Credentials.
syslog_drain_url  string  A URL to which Cloud Foundry should drain logs to for the bound application. The syslog_drain permission is required for logs to be automatically wired to applications.
*/
/* cf bind-service */
router.put('/service_instances/:instance_id/service_bindings/:id', function(req, res) {
  console.log('BODY', req.body);
  console.log('PARAMS', req.params);
  // FIXME: Lookup binding association by binding guid (create if not exists) and return creds!!!
  res.status(201).json({
    credentials: {
      uri: 'http://super-awesome-endpoint.com'
    },
    syslog_drain_url: ''
  });
});

/*
QUERY-STRING FIELD  TYPE  DESCRIPTION
service_id* string  ID of the service from the catalog. While not strictly necessary, some brokers might make use of this ID.
plan_id*  string  ID of the plan from the catalog. While not strictly necessary, some brokers might make use of this ID.

STATUS CODE DESCRIPTION
200 OK  Binding was deleted. The expected response body is “{}”
410 Gone  Shall be returned if the binding does not exist. The expected response body is “{}”

*/
/* cf unbind-service */
router.delete('/service_instances/:instance_id/service_bindings/:id', function(req, res) {
  console.log('BODY', req.body);
  console.log('PARAMS', req.params);
  res.status(200).json({});
});

module.exports = router;
