#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');

var asset = require('./assets.json');

var getAssetSync = function(type, version) {
    //
    if (typeof version === 'undefined')
      version = 'newest';
    if (typeof asset[type][version] === 'undefined')
        return 'Invalid version number';
    else
        return fs.readFileSync(asset[type][version]);
}

var getAsset = function(type, version, res) {
    //
    if (typeof version === 'undefined')
      version = 'newest';
    if (typeof asset[type][version] === 'undefined')
        return 'Invalid version number';
    else
        fs.readFile(asset[type][version], function(err, data){
            if (err)
                console.error(err);
            if (data)
                res.send(data);
            else
                res.send('No data available.');
        });
}

/**
 *  Define the sample application.
 */
var SampleApp = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_INTERNAL_IP;
        self.port      = process.env.OPENSHIFT_INTERNAL_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_INTERNAL_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 
                'index.html': '' ,
                'jQuery': '',
                'bootstrap': '',
                'bootstrap-css': '',
                'backbone': ''
            };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
        self.zcache['jQuery'] = getAssetSync('jQuery');
        self.zcache['bootstrap'] = getAssetSync('bootstrap');
        self.zcache['bootstrap-css'] = getAssetSync('bootstrap-css');
        self.zcache['backbone'] = getAssetSync('backbone');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };
        // Routes

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html'));
        };

        self.routes['/jQuery'] = function(req, res) {
            res.setHeader('Content-Type', 'text/javascript');
            if (typeof req.query.v === 'undefined' && typeof req.query.dev === 'undefined')
                res.send(self.cache_get('jQuery') );
            else {
                if (req.query.dev)
                    getAsset('jQuery-dev', req.query.v, res);
                else
                    getAsset('jQuery', req.query.v, res);
            }
        };

        self.routes['/bootstrap-css'] = function(req, res) {
            res.setHeader('Content-Type', 'text/css');
            if (typeof req.query.v === 'undefined' && typeof req.query.dev === 'undefined' && typeof req.query.icon === 'undefined')
                res.send(self.cache_get('bootstrap-css') );
            else {
                if (req.query.icon == 'false') {
                    if (req.query.dev)
                        getAsset('bootstrap-css-noicon-dev', req.query.v, res);
                    else
                        getAsset('bootstrap-css-noicon', req.query.v, res);
                } else {
                    if (req.query.dev)
                        getAsset('bootstrap-css-dev', req.query.v, res);
                    else
                        getAsset('bootstrap-css', req.query.v, res);
                }
            }
        };

        self.routes['/bootstrap'] = function(req, res) {
            res.setHeader('Content-Type', 'text/javascript');
            if (typeof req.query.v === 'undefined' && typeof req.query.dev === 'undefined')
                res.send(self.cache_get('bootstrap') );
            else {
                if (req.query.dev)
                    getAsset('bootstrap-dev', req.query.v, res);
                else
                    getAsset('bootstrap', req.query.v, res);
            }
        };

        self.routes['/backbone'] = function(req, res) {
            res.setHeader('Content-Type', 'text/javascript');
            if (typeof req.query.v === 'undefined' && typeof req.query.dev === 'undefined')
                res.send(self.cache_get('backbone') );
            else {
                if (req.query.dev)
                    getAsset('backbone-dev', req.query.v, res);
                else
                    getAsset('backbone', req.query.v, res);
            }
        };
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express.createServer();
        self.app.use(express.static(__dirname + '/assets'));

        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  Sample Application.  */



/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();

