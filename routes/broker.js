var request = require('request');
var express = require('express');
var uuid = require('node-uuid');
var router = express.Router();

var db = {
  instances: {}, // instance_guid-to-docker_guid association
  bindings: {}, // binding_guid-to-app_guid association
}

var service_guid = uuid.v4();
var free_plan_guid = uuid.v4();

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
  if (db[instanceId]) {
    res.status(409).json({});
  } else {
    console.log('Attempting to create docker:', process.env.DOCKER_URL + '/containers/create');
    request.post(process.env.DOCKER_URL + '/containers/create', {
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
        "PortSpecs":null,
        "Tty":false,
        "OpenStdin":false,
        "StdinOnce":false,
        "Env":[
          "username=postgres",
          "password=postgres"
        ],
        "Cmd":[],
        "Image":"frodenas/postgresql:latest",
        "Volumes":{},
        "WorkingDir":null,
        "NetworkDisabled": false,
        "ExposedPorts":{}
      }
    }, function (err, response, body) {
      if (err) {
        console.error('DOCKER CREATE ERROR:', err, body);
        res.status(500).json({
          error: err
        });
      } else {
        var containerId = body.Id;
        console.log('DOCKER CREATE RESULT:', body);
        // Now that it's created, RUN it!
        request.post(process.env.DOCKER_URL + '/containers/' + containerId + '/start', function (err, response, body) {
          console.log('DOCKER RUN RESULT:', err, response, body);
          if (err) {
            console.error(err);
            res.status(500).json({
              error: err
            });
          } else {
            // store the docker ID associated with this instance ID
            db.instances[instanceId] = containerId;
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
  // FIXME: container.kill, container.remove, remove guid and association for instance!!!
  /*
    request.post(process.env.DOCKER_URL + '/containers/create', {}, function (err, response, body) {
      if (err) {
        console.error('DOCKER CREATE ERROR:', err);
        res.status(500).json({
          error: err
        });
      } else {
        console.log('DOCKER CREATE RESULT:', response);
        // store a guid associated with this instance
        db[req.params.id] = response;
        res.status(201).json({
          dashboard_url: dashboard_url
        });
      }
    });
  */
  delete db[req.params.id];
  res.status(200).json({});
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
