var request = require('request');
var express = require('express');
var uuid = require('node-uuid');
var mysql = require('mysql');
var router = express.Router();
var randomstring = require('randomstring');

var dockerHost = process.env.DOCKER_HOST;
var dockerPort = process.env.DOCKER_PORT;
var databaseHost = process.env.DATABASE_HOST || dockerHost;
var dockerUrl = 'http://' + dockerHost + ':' + dockerPort;

var instances = {};

var serviceGuid = uuid.v4();
var freePlanGuid = uuid.v4();
var instancePort = 50001;

function getRandomPort() {
  // FIXME: Of course, this will only give you about 15k instances. Ever. With no reuse.
  return instancePort++;
}

function getDatabaseConnection(options, callback) {
  var connectionOptions = {
    host     : options.host,
    port     : options.port,
    user     : options.adminUsername,
    password : options.adminPassword,
    connectTimeout: 1000 // 1 second timeout for the internets :(
  };
  console.log('Attempting connection to database:', connectionOptions);
  var connection = mysql.createConnection(connectionOptions);
  connection.connect(function (err) {
    if (err) {
      console.error('MYSQL CONNECTION ERROR:', err, err.stack);
    } else {
      console.log('MYSQL CONNECTED');
    }
    callback(err, connection);
  });
}

function dockerCreate(options, callback) {
  var instanceId = options.instanceId;
  var adminPassword = randomstring.generate(8);
  request.post(dockerUrl + '/containers/create', {
    json: {
      "AttachStderr": false,
      "AttachStdin": false,
      "AttachStdout": false,
      "Cmd": [],
      "CpuShares": 0,
      "Cpuset": "",
      "Domainname": "",
      "Entrypoint": null,
      "Env": [
        "MYSQL_PASS=" + adminPassword,
      ],
      "ExposedPorts": {
        "3306/tcp": {}
      },
      "Hostname": instanceId,
      "Image": "tutum/mysql",
      "Memory": 0,
      "MemorySwap": 0,
      "NetworkDisabled": false,
      "OnBuild": null,
      "OpenStdin": false,
      "PortSpecs": null,
      "StdinOnce": false,
      "Tty": false,
      "User": "",
      "Volumes": {},
      "WorkingDir": ""
    }
  }, function (err, response, body) {
    console.log('DOCKER CREATE:', err, body);
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
    json: {
      "PortBindings": {
        "3306/tcp": [{
          "HostPort": exposedPort.toString()
        }]
      }
    }
  }, function (err, response, body) {
    console.log('DOCKER START:', err, body);
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
    console.log('DOCKER STOP:', err, body);
    if (!err) {
      console.log('DOCKER STOPPED IMAGE', containerId);
    }
    callback(err, {});
  });
}

function dockerRemove(options, callback) {
  var containerId = options.containerId;
  request.del(dockerUrl + '/containers/' + containerId, function (err, response, body) {
    console.log('DOCKER REMOVE:', err, body);
    if (!err) {
      console.log('DOCKER REMOVED IMAGE', containerId);
    }
    callback(err, {});
  });
}

function databaseCreate(options, callback) {
  var databaseName  = randomstring.generate(8);
  setTimeout(function () {
    getDatabaseConnection(options, function (err, connection) {
      if (err) {
        callback(err, {});
      } else {
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
    });
  }, 10000); // 10 second delay to allow mysql availability
}

function databaseGrant(options, callback) {
  var databaseName = options.databaseName;
  var username = randomstring.generate(8);
  var password = randomstring.generate(8);
  getDatabaseConnection(options, function (err, connection) {
    if (err) {
      callback(err, {});
    } else {
      var sql = "GRANT ALL PRIVILEGES ON " + databaseName + ".* TO '" + username + "'@'%' IDENTIFIED BY '" + password + "' WITH GRANT OPTION";
      console.log('GRANT Attempting to execute:', sql);
      connection.query(sql, function(err, rows, fields) {
        connection.end();
        console.log('DATABASE GRANT:', err, rows, fields);
        if (!err) {
          console.log('DATABASE GRANT', databaseName);
        }
        callback(err, {
          username: username,
          password: password
        });
      });
    }
  });
}

function databaseRevoke(options, binding, callback) {
  var databaseName = options.databaseName;
  getDatabaseConnection(options, function (err, connection) {
    if (err) {
      callback(err, {});
    } else {
      var sql = "REVOKE ALL PRIVILEGES, GRANT OPTION FROM '" + binding.username + "'@'%'";
      console.log('REVOKE Attempting to execute:', sql);
      connection.query(sql, function(err, rows, fields) {
        connection.end();
        console.log('DATABASE REVOKE:', err, rows, fields);
        if (!err) {
          console.log('DATABASE REVOKE', databaseName);
        }
        callback(err, {});
      });
    }
  });
}

/* cf marketplace */
router.get('/catalog', function(req, res) {
  res.status(200).json({
    services: [{
      id: serviceGuid,
      name: 'mysql-docker',
      description: 'MySQL DB in a Docker back end',
      bindable: true,
      plans: [{
        id: freePlanGuid,
        name: 'free',
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

  // Check to see if the requested service instance already exists
  if (instances[instanceId]) {
    res.status(409).json({});
  } else {
    console.log('Attempting to create docker:', dockerUrl + '/containers/create');
    // Make a record of this attempt
    instances[instanceId] = {
      instanceId: instanceId,
      adminUsername: 'admin',
      host: databaseHost,
      bindings: {}
    };
    dockerCreate(instances[instanceId], function (err, result) {
      if (err) {
        console.error('DOCKER CREATE ERROR:', err, result);
        res.status(500).json({
          error: err
        });
      } else {
        // We're heading in the right direction. Store what we know:
        instances[instanceId].containerId = result.containerId;
        instances[instanceId].adminPassword = result.adminPassword;
        // Now that it's created, RUN it!
        dockerStart(result, function (err, result) {
          if (err) {
            console.error('DOCKER START ERROR:', err);
            res.status(500).json({
              error: err
            });
          } else {
            // store the port for future credentials passing
            instances[instanceId].port = result.exposedPort;

            console.log('Attempting to databaseCreate:', instances[instanceId]);
            databaseCreate(instances[instanceId], function (err, result) {
              if (err) {
                console.error('CREATE DATABASE ERROR:', err);
                  res.status(500).json({
                    error: err
                  });
              } else {
                // Store the database name for future credentials passing
                instances[instanceId].databaseName = result.databaseName;
                res.status(201).json({
                  dashboard_url: dashboard_url
                });
              }
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
  var instanceId = req.params.instance_id;
  var bindingId = req.params.id;

  // Check to see if the requested service instance already exists
  if (instances[instanceId] && instances[instanceId].bindings[bindingId]) {
    res.status(409).json({});
  } else {
    console.log('Attempting to bind to instance:', instanceId);
    // Make a record of this attempt
    instances[instanceId].bindings[bindingId] = {
      bindingId: bindingId,
      appId: req.body.app_guid,
      username: randomstring.generate(8),
      password: randomstring.generate(8)
    };
    databaseGrant(instances[instanceId], function (err, result) {
      if (err) {
        console.error('DATABASE GRANT ERROR:', err, result);
        res.status(500).json({
          error: err
        });
      } else {
        // Store user/pass for this binding
        instances[instanceId].bindings[bindingId].username = result.username;
        instances[instanceId].bindings[bindingId].password = result.password;
        var credentials = {
          "uri" : "mysql://" + 
                  instances[instanceId].bindings[bindingId].username + ":" + 
                  instances[instanceId].bindings[bindingId].password + "@" + 
                  instances[instanceId].host + ":" + 
                  instances[instanceId].port + "/" + 
                  instances[instanceId].databaseName + "?reconnect=true",
          "jdbcurl" : "jdbc:mysql://" +
                  instances[instanceId].bindings[bindingId].username + ":" + 
                  instances[instanceId].bindings[bindingId].password + "@" + 
                  instances[instanceId].host + ":" + 
                  instances[instanceId].port + "/" + 
                  instances[instanceId].databaseName,
          "name" : instances[instanceId].databaseName,
          "database" : instances[instanceId].databaseName,
          "host" : instances[instanceId].host,
          "hostname" : instances[instanceId].host,
          "port" : instances[instanceId].port,
          "user" : instances[instanceId].bindings[bindingId].username,
          "username" : instances[instanceId].bindings[bindingId].username,
          "password" : instances[instanceId].bindings[bindingId].password
        };
        console.log('BIND RETURNING CREDS:', credentials);
        res.status(201).json({credentials: credentials, syslog_drain_url: ''});
      }
    });
  }
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
  var instanceId = req.params.instance_id;
  var bindingId = req.params.id;
  if (instances[instanceId] && instances[instanceId].bindings[bindingId]) {
    databaseRevoke(instances[instanceId], instances[instanceId].bindings[bindingId], function (err, result) {
      if (err) {
        console.error('DATABASE REVOKE ERROR:', err, result);
        res.status(500).json({
          error: err
        });
      } else {
        delete instances[instanceId].bindings[bindingId];
        res.status(200).json({});
      }
    });
  } else {
    res.status(410).json({});
  }
});

module.exports = router;
