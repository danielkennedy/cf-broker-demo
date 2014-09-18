var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/catalog', function(req, res) {
  res.json({
    services: [{
      id: '12345', //  string  An identifier used to correlate this service in future requests to the catalog. This must be unique within Cloud Foundry, using a GUID is recommended.
      name: 'awesome-sauce', // string  The CLI-friendly name of the service that will appear in the catalog. All lowercase, no spaces.
      description: 'This is where the magic happens', // string  A short description of the service that will appear in the catalog.
      bindable: true, // boolean Whether the service can be bound to applications.
      plans: [{
        id: '54321', // string  An identifier used to correlate this plan in future requests to the catalog. This must be unique within Cloud Foundry, using a GUID is recommended.
        name: 'free-as-in-beer', // string  The CLI-friendly name of the plan that will appear in the catalog. All lowercase, no spaces.
        description: 'The best things in life are free' // string  A short description of the service that will appear in the catalog.
      }]
    }]
  });
});

/*
REQUEST FIELD TYPE  DESCRIPTION
service_id* string  The ID of the service within the catalog above. While not strictly necessary, some brokers might make use of this ID.
plan_id*  string  The ID of the plan within the above service (from the catalog endpoint) that the user would like provisioned. Because plans have identifiers unique to a broker, this is enough information to determine what to provision.
organization_guid*  string  The Cloud Controller GUID of the organization under which the service is to be provisioned. Although most brokers will not use this field, it could be helpful in determining data placement or applying custom business rules.
space_guid* string  Similar to organization_guid, but for the space.

STATUS CODE DESCRIPTION
201 Created Service instance has been created. The expected response body is below.
409 Conflict  Shall be returned if the requested service instance already exists. The expected response body is “{}”
200 OK  May be returned if the service instance already exists and the requested parameters are identical to the existing service instance. The expected response body is below.

RESPONSE FIELD  TYPE  DESCRIPTION
dashboard_url string  The URL of a web-based management user interface for the service instance; we refer to this as a service dashboard. The URL should contain enough information for the dashboard to identify the resource being accessed (“9189kdfsk0vfnku” in the example below). For information on how users can authenticate with service dashboards via SSO, see Dashboard Single Sign-On.

*/
router.put('/service_instances/:id', function(req, res) {
  res.send('respond with a resource');
});

/*
QUERY-STRING FIELD  TYPE  DESCRIPTION
service_id* string  ID of the service from the catalog. While not strictly necessary, some brokers might make use of this ID.
plan_id*  string  ID of the plan from the catalog. While not strictly necessary, some brokers might make use of this ID.

STATUS CODE DESCRIPTION
200 OK  Service instance was deleted. The expected response body is “{}”
410 Gone  Shall be returned if the service instance does not exist. The expected response body is “{}”

*/
router.delete('/service_instances/:id', function(req, res) {
  res.send('respond with a resource');
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
router.put('/service_instances/:instance_id/service_bindings/:id', function(req, res) {
  res.send('respond with a resource');
});

/*
QUERY-STRING FIELD  TYPE  DESCRIPTION
service_id* string  ID of the service from the catalog. While not strictly necessary, some brokers might make use of this ID.
plan_id*  string  ID of the plan from the catalog. While not strictly necessary, some brokers might make use of this ID.

STATUS CODE DESCRIPTION
200 OK  Binding was deleted. The expected response body is “{}”
410 Gone  Shall be returned if the binding does not exist. The expected response body is “{}”

*/
router.delete('/service_instances/:instance_id/service_bindings/:id', function(req, res) {
  res.send('respond with a resource');
});

module.exports = router;
