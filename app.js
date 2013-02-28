/**
 * Created with JetBrains WebStorm.
 * User: Alpha
 * Date: 2/17/13
 * Time: 11:03 AM
 * To change this template use File | Settings | File Templates.
 */
var Hapi = require('hapi');
var mongo = require('mongoskin');
var querystring = require('querystring');
var http = require('http');
var fs = require('fs');

var csv = require('csv');
//mongo.db('localhost:27017/testdb').collection('offset').find().toArray(function (err, items) {
//    console.dir(items);
//})

var _mysql = require('mysql');

var HOST = '192.168.0.197';
var PORT = 3306;
var MYSQL_USER = 'root';
var MYSQL_PASS = 'root';
var DATABASE = 'test';
var TABLE = 'offset';

//var mysql = _mysql.createClient({
//    host: HOST,
//    port: PORT,
//    user: MYSQL_USER,
//    password: MYSQL_PASS
//});
//
//mysql.query('use ' + DATABASE);


if(process.env.VCAP_SERVICES){
    var env = JSON.parse(process.env.VCAP_SERVICES);
    var mongo = env['mongodb-1.8'][0]['credentials'];
}
else{
    var mongo = {
        "hostname":"localhost",
        "port":27017,
        "username":"",
        "password":"",
        "name":"",
        "db":"test"
    }
}
var generate_mongo_url = function(obj){
    obj.hostname = (obj.hostname || 'localhost');
    obj.port = (obj.port || 27017);
    obj.db = (obj.db || 'test');
    if(obj.username && obj.password){
        return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }
    else{
        return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }
}
var mongourl = generate_mongo_url(mongo);


   // var db = require('mongoskin').db('localhost:27017/test');
var db = require('mongoskin').db(mongourl);

// Create a server with a host and port
var server = new Hapi.Server('localhost', 8000);
var fetch1 = function (request, next) {

    next('Hello');
};

var fetch2 = function (request, next) {

    next('api');
};

var fetch3 = function (request, next) {

    next(request.pre.m1 + ' ' + request.pre.m2);
};

var get = function (request) {

    mysql.query('select id, name, price from ' + TABLE + ' where price < 100',
        function(err, result, fields) {
            if (err) throw err;
            else {
                console.log('Gadgets which costs less than $100');
                console.log('----------------------------------');
                for (var i in result) {
                    var gadget = result[i];
                    console.log(gadget.name +': '+ gadget.price);
                }
            }
        });

    //request.reply(request.pre.m3 + '\n');
    var querystring = require('querystring');

    var data = querystring.stringify({
        lat: '113',
        lng: '113'
    });

    var options = {
        host: 'localhost',
        port: 8000,
        path: '/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': data.length
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log("body: " + chunk);
        });
    });

    req.write(data);
    req.end();
    //request.reply(request.pre.m3 + '\n');
    request.reply("Ok")
};

// Set routes
server.route({
    method: 'GET',
    path: '/pre',
    config: {
        pre: [
            { method: fetch1, assign: 'm1', mode: 'parallel' },
            { method: fetch2, assign: 'm2', mode: 'parallel' },
            { method: fetch3, assign: 'm3' }
        ],
        handler: get
    }
});
// Define the route
var hello = {
    handler: function (request) {

        //request.reply({ greeting: 'hello ' + request.query.lat +","+request.query.lng });
//        db.get('user', request.params.id, function (err, item) {
//            if (err) {
//                return request.reply(Hapi.error.notFound());
//            }
//            request.reply(item); });
//        db.collection('bands').findOne({name:'Road Crew'}, function(err, result) {
//            console.log('Band members of Road Crew');
//            console.log(result.members);
//        });

        //note:toFix use round , need to fix later
        db.collection('offset').findOne({lat:Math.round(parseFloat(request.query.lat)*10)/10,lng:parseFloat(Math.round(parseFloat(request.query.lng)*10)/10)},function(err, result) {
            //console.log('Band members of Road Crew');
            //request.reply(result);
            request.reply((parseFloat(request.query.lat)+result.offset_lat).toFixed(6)+","+(parseFloat(request.query.lng)+result.offset_lng).toFixed(6));
            //console.log(result[0].members);`
        });
    },
    validate: {
        query: {
            lng: Hapi.types.Number().min(73).max(135).required().without('username'),
            lat: Hapi.types.Number().min(39).max(53).required().without('80ss')

        }
    }
};

var putHello = {
    handler: function (request) {
        db.collection('offset').insert({lat: parseFloat(request.payload.lat), lng:parseFloat(request.payload.lng),offset_lng:parseFloat(request.payload.offset_lng),offset_lat:parseFloat(request.payload.offset_lat)}, function(err, result) {
            if (err) throw err;
            if (result)
            {
                //console.log('Added!');
                request.reply("OK");
            }
        });


//        db.get('user', request.params.id, function (err, item) {
//            if (err) {
//                return request.reply(Hapi.error.notFound());
//            }
//            request.reply(item); });
    },
    validate: {
        query: {
//            lat: Hapi.types.Number().min(100).max(120).required().without('username'),
//            lng:Hapi.types.Number().min(100).max(120).required().without('80ss')

        }
    }
};




// Add the route
server.route({
    method: 'GET',
    path: '/',
    config: hello

});
server.route({
    method: 'POST',
    path: '/',
    config: putHello

});

var inithandler;
inithandler = function (request) {


    csv().from(__dirname + '/offset1.txt')
        .on('record', function (row, index) {

            db.collection('offset').insert({lat: parseFloat(row[1]), lng:parseFloat(row[0]),offset_lng:parseFloat(row[4]),offset_lat:parseFloat(row[5])}, function(err, result) {
                if (err) throw err;
                if (result)
                {
                    //console.log('Added!');
                    console.log('##' + index + ' ' + JSON.stringify(row));
                }
            });


        })
        .on('end', function (count) {
            //console.log('Number of lines: ' + count);
            request.reply('Number of lines: ' + count);
        })
//        .on('error', function (error) {
//            console.log(error.message);
//        });

//    csv()
//        .from.stream(fs.createReadStream(__dirname + '/offset.txt')
//        .to.path(__dirname + '/sample.out')
//        .transform(function (row) {
//            row.unshift(row.pop());
//            return row;
//        })
//        .on('record', function (row, index) {
//            console.log('#' + index + ' ' + JSON.stringify(row));
//        })
//        .on('end', function (count) {
//            console.log('Number of lines: ' + count);
//        })
//        .on('error', function (error) {
//            console.log(error.message);
//        }))
//    csv()
//        .from( '"1","2","3","4"\n"a","b","c","d"' )
//        .to( console.log )


};
server.addRoute({ method: 'GET', path: '/init', handler: inithandler
});


// Start the server
server.start();
