// mkdir server && cd server
// [copy this js file to `server.js`]
// npm install ws
// npm install mdns
// node server.js

const PORT=25698;

// -------------------------------------------------------
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: PORT});

wss.on('connection', function(ws) {
    
    ws.on('error', function() {
        console.log('error\n');
    });
    
    ws.on('close', function() {
        console.log('closed\n');
    });
    
    ws.on('message', function(message) {
        console.log('received: %s', message);
    });
    
    ws.send('Server connected');
});

// -------------------------------------------------------
var mdns = require('mdns');
var ad = mdns.createAdvertisement(mdns.tcp('dbb'), PORT);
ad.start();
console.log("mDNS advertised");




