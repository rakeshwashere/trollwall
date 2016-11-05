var express = require('express');
var app = express();
var port = 8001
var socketPort = 3000
var pool = require('./dbConnect')
var io = require('socket.io')(socketPort)
// var removeRoute = require('express-remove-route');
var fs = require('fs')
var pg = require('pg')
var databasePort = process.env.CSDBPORT || 5432
var databaseName = 'starwars'//process.env.CSDBNAME || ''
var databaseUserName = process.env.CSDBUSER 
var databasePassword = process.env.CSDBPASSWORD 
var databaseURL = process.env.CSDBURL

var restifierDBName = 'restifier'

var conString = `postgres://${databaseUserName}:${databasePassword}@${databaseURL}:${databasePort}/${databaseName}`
var client = new pg.Client(conString)
client.connect()

var restifierConString = `postgres://${databaseUserName}:${databasePassword}@${databaseURL}:${databasePort}/${restifierDBName}`
var restifierClient = new pg.Client(restifierConString)
restifierClient.connect()

var router = undefined
var done = null
    
    function reloadRoutes(callback) {

        console.log('executing reload')
        require('./routes/')(app, client, done)
        callback('reload done')

    }   

    function addRoute(request, callback) {

        var tableName = request.tableName
        var verb      = request.verb
        // var callbackFunc  = request.callback
        var route     = tableName 
        var routeFile = `./routes/${tableName}_${verb}.js`

        var code = `module.exports= function (router, client, done) { \n\
                  console.log('Adding the ${routeFile} file to the router')\n\
                  router.get('/${tableName}', function(req, res) {
                      client.query("SELECT * FROM ${tableName}", function(err, result) {
                        // done()
                         if (result)
                            res.send(result.rows)
                        else
                            res.send('something went wrong')
                    })\n
                })\n
            }`

        // console.log(`INSERT into routes("route") values (${route})`)
        restifierClient.query("insert into endpoints (route, verb, routeFile) values ($1, $2, $3)", [route, verb, routeFile], function(err, result) {
            if (err) {
                console.log('Something went wrong with insert statement')
                console.log(err)
                callback('route not added, something went wrong')
            }
            else {
                console.log(result.rows)
                 fs.writeFileSync(routeFile, code)
                require(routeFile)(app, client, done)
                callback('new route added')
            }
        })

       

    }

    function removeRoute(request, callback) {

        var tableName = request.tableName
        var verb      = request.verb
        if (!app._router){
            callback('remove done')
            return
        }
        var stack     = app._router.stack

        

        var indices   = []
        var routeFile = `./routes/${tableName}_${verb}.js`

        restifierClient.query("delete from endpoints where route ='" + tableName + "' and verb ='" + verb +"'", function(err, result) {
            if (err) {
                console.log(err)
                callback('removing route didnt work')
                return
            }

            if (fs.existsSync(routeFile)) {
                fs.unlinkSync(routeFile)
            }   
        })

        for (var i = 0; i < stack.length; i++) {
            if (stack[i].name === 'bound dispatch') {
                indices.push(i)
            }
        }

        for (var i = indices.length - 1; i >= 0; i--) {
            var index = indices[i]
            stack.splice(index, 1)
        }

        callback('remove done')

    }


    // require('./routes/')(app, client, done)
    // removeAllRoutes()

    app.listen(port, function() {
        console.log('Example app listening on port ' + port + '!');
    })

    io.on('connection', function(socket) {

        socket.on('reload_routes', reloadRoutes)
        socket.on('add_route', addRoute)
        socket.on('remove_route', removeRoute)
        socket.on('disconnect', function() {
            io.emit('user disconnected');
        })
        
    })
// })