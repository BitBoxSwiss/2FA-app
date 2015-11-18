// mkdir websocket && cd websocket
// # copy this js file to `server.js`
// # `tests_cmdline_live` can be built from the digitalbitbox/mcu code
// npm install ws
// npm install mdns
// node server.js

const PORT=25698;

var WebSocketServer = require('ws').Server;
var mdns = require('mdns');
var Exec = require('child_process').execSync;


// -------------------------------------------------------
var ad = mdns.createAdvertisement(mdns.tcp('dbb'), PORT);
ad.start();
console.log("mDNS advertised");


// -------------------------------------------------------
var wss = new WebSocketServer({port: PORT});

wss.on('connection', function(ws) {
    
    ws.on('error', function() {
        console.log('error\n');
    });
    
    ws.on('close', function() {
        console.log('closed\n');
    });
    
    ws.on('message', function(message) {
        var res;
        try {
            res = JSON.parse(message);
           
            if (typeof res.ecdh == "string") {
                // ECDH PAIRING
                var cmd = './tests_cmdline_live \'{"verifypass":' + JSON.stringify(res) + '}\'';
                reply = Exec(cmd).toString();
                reply = JSON.parse(reply);
                if (wssSend(JSON.stringify(reply))) { return; }

            } else if(typeof res.tfa == "string") {
                // TFA MESSAGE
                console.log('TFA message: %s', message);
            
            } else {
                // UNKNOWN MESSAGE    
                console.log('Unknown message: %s', message);
            }
        }
        catch (err) {
            //console.log(err);
            console.log('received: %s', message);
        }
    });
    
    setTimeout(function() { runCode(); }, 1000);

});

wss.broadcast = function broadcast(data) {
    console.log('Broadcasting: ' + data);
    wss.clients.forEach(function each(client) {
        client.send(data);
    });
};


var wssSendData = "";

var wssSend = function(data) {
    wssSendData = data;
    while (wssBroadcast()) {
        Exec('sleep 1');
        console.log('.');
    }
    return 0;
};

var wssBroadcast = function () {
    if (wss.clients.length) {
        wss.broadcast(wssSendData);
        return 0; 
    }
    return 1;
};





// -------------------------------------------------------
// -------------------------------------------------------
// WIP
// 


// Signature verification
//var cmd = './tests_cmdline_live \'{"led":"toggle"}\'';
var cmdSign = './tests_cmdline_live \'{"sign": {"meta":"_meta_data_", "data":[{"hash":"c12d791451bb41fd4b5145bcef25f794ca33c0cf4fe9d24f956086c5aa858a9d", "keypath":"m/44p/0p/0p/1/8"},{"hash":"3dfc3b1ed349e9b361b31c706fbf055ebf46ae725740f6739e2dfa87d2a98790", "keypath":"m/44p/0p/0p/0/5"}]}}\'';


function sysExecSign(cmd) {
    var reply = Exec(cmd).toString();
    console.log(reply);
    wssSend(reply); 
    
    reply = Exec(cmd).toString();
    console.log(reply);
    process.exit();
};



function runCode() 
{
    //sysExecSign(cmdSign);
}



