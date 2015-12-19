/*
 
 The MIT License (MIT)

 Copyright (c) 2015 Douglas J. Bakkum, Shift Devices AG

 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the "Software"),
 to deal in the Software without restriction, including without limitation
 the rights to use, copy, modify, merge, publish, distribute, sublicense,
 and/or sell copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included
 in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
 OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.

*/

'use strict';

var Crypto = require("crypto");
var Bitcore = require("bitcore-lib");
var Ripemd160 = require('ripemd160');
var Base58Check = require('bs58check')
var Reverse = require("buffer-reverse")


const PORT = 25698;
const TIMEOUT = 1500; // ms
const WARNFEE = 10000; // satoshis TODO update
const SAT2BTC = 100000000; // conversion
const COINNET = 'livenet';
//const COINNET = 'testnet';

const DBB_COLOR_SAFE = "#0C0",
      DBB_COLOR_WARN = "#880",
      DBB_COLOR_DANGER = "#C00",
      DBB_COLOR_BLACK = "#000";
    
const OP_CHECKMULTISIG = 'ae',
      OP_1 = '51';


var ws = null;
var ws_opt = {
        IP: null,
        address: '',
        name: '',
        pollinterval: 1000, // msec
    };

var ui = {
    pairIcon: null,
    pairDialog: null,
    pwDialog: null,
    ipDialog: null,
    pwText: null,
    ipText: null,
    clearButton: null,
    cancelButton: null,
    cancelIpButton: null,
    detailsButton: null,
    blinkDelButton: null,
    blink1Button: null,
    blink2Button: null,
    blink3Button: null,
    blink4Button: null,
    forgetPwButton: null,
    submitPwButton: null,
    submitIpButton: null,
    ipScanButton: null,
    ipManualButton: null,
    connectOptionButtons: null,
    pairManualButton: null,
    pairBeginButton: null,
    pairCancelButton: null,
    pairOptionButton: null,
    pairStrength: null,
    settingsIcon: null,
    optionButtons: null,
    showScanButton: null,
    scanButton: null, 
    infoText: null,
    splashScreen: null,
};

var ecdh = Crypto.createECDH('secp256k1');
var pair = {
        blinkcode: [],
        ipFile: null,
        keyFile: null,
        ip_saved: "",
        key: "",
        QRtext: [],
        inputAddresses: [],
    };
        
var res_detail = "";



// ----------------------------------------------------------------------------
// Startup
// 

document.addEventListener("deviceready", init, false);

function init()
{
    
    for (var u in ui) {
      var id = u.replace(/([A-Z])/g, '-$1').toLowerCase();
      var element = document.getElementById(id);
      if (!element) {
        throw "Missing UI element: " + u;
      }
      ui[u] = element;
    }
    
    navigator.splashscreen.hide();
    fade(ui.splashScreen); 
	
    ui.clearButton.addEventListener("touchstart", cancelClear, false);
    ui.cancelButton.addEventListener("touchstart", cancelClear, false);
    ui.cancelIpButton.addEventListener("touchstart", cancelClear, false);
    //ui.changepwButton.addEventListener("touchstart", setKey, false);
    ui.submitPwButton.addEventListener("touchstart", saveKey, false);
    ui.submitIpButton.addEventListener("touchstart", setIP, false);
    ui.forgetPwButton.addEventListener("touchstart", forget, false);
    ui.settingsIcon.addEventListener("touchstart", displaySettings, false);
    ui.detailsButton.addEventListener("touchstart", details, false);
    ui.pairOptionButton.addEventListener("touchstart", pairEnter, false);
    ui.pairBeginButton.addEventListener("touchstart", pairPc, false);
    ui.pairCancelButton.addEventListener("touchstart", cancelClear, false);
    ui.pairManualButton.addEventListener("touchstart", pairManual, false);
    ui.ipManualButton.addEventListener("touchstart", ipManual, false);
    ui.ipScanButton.addEventListener("touchstart", startScan, false);
    ui.pairIcon.addEventListener("touchstart", pairStatus, false);
    ui.showScanButton.addEventListener("touchstart", startScan, false);
    //ui.showScanButton.addEventListener("touchstart", showScanButton, false);
    //ui.scanButton.addEventListener("touchstart", startScan, false);
    
    ui.blinkDelButton.addEventListener("touchstart", blinkDel, false);
    ui.blink1Button.addEventListener("touchstart", blinkPress1, false);
    ui.blink2Button.addEventListener("touchstart", blinkPress2, false);
    ui.blink3Button.addEventListener("touchstart", blinkPress3, false);
    ui.blink4Button.addEventListener("touchstart", blinkPress4, false);
    
    loadFiles();
    setInterval(wsFind, ws_opt.pollinterval);
}

 
function fade(element) {
    var op = 1;  // opaque
    var timer = setInterval(function () {
        if (op <= 0.01){
            clearInterval(timer);
            element.style.display = 'none';
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ')';
        op -= 0.05;
    }, 20);
}


// ----------------------------------------------------------------------------
// Network status
//

function checkConnection() {
    var networkState = navigator.connection.type;

    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.CELL]     = 'Cell generic connection';
    states[Connection.NONE]     = 'No network connection';

    console.log('Connection type: ' + states[networkState]);
}


// ----------------------------------------------------------------------------
// Websockets
//

function wsStart() {
    if (!ws || ws.readyState == ws.CLOSED) {
        console.log('WebSocket found at ', ws_opt.address);
        
        ws = new WebSocket(ws_opt.address);
    
        ws.onopen = function () {
            ui.pairIcon.style.visibility = "visible";
            console.log('WebSocket openned');
            wsSend('{"tfa": "Hello dbb app!"}');
        };

        ws.onmessage = function (event) {
            console.log('WebSocket received: ', event.data);
            parseData(event.data);
        };

        ws.onerror = function () {
            console.log('WebSocket error!');
        };

        ws.onclose = function (event) {
            console.log('WebSocket closed ', event.code);
            ui.pairIcon.style.visibility = "hidden";
            ws_opt.address = '';
            ws_opt.name = '';
        };
    }
};


function wsSend(message) {
    if (ws) {
        if (ws.readyState == ws.OPEN) {
            ws.send(message);
        }
    }
}


var alternate = 0;
function wsFind() {
    if (ws_opt.IP) {
        ws_opt.address = 'ws://' + ws_opt.IP + ':' + PORT;
        ws_opt.name = 'Manually entered';
        if (alternate = !alternate) {
            wsStart();
            return;
        }
    }

    if (navigator.connection.type === Connection.WIFI) {
        ZeroConf.watch("_dbb._tcp.local.", wsFound); // does not reconnect if turn off/on wifi
        return;
    }

    checkConnection();
}


function wsFound(obj) {
    ws_opt.address = 'ws://' + obj.service.addresses[0] + ':' + obj.service.port;
    //ws_opt.address = 'ws://' + obj.service.server + ':' + obj.service.port;
    ws_opt.name = obj.service.name;
    wsStart();
}


//function mdnsAdvertise() {
    //const PORT = 25698;
    //ZeroConf.register("_http._tcp.local.", "DBBapp", PORT, "name=DBBapp_text");
//}


// ----------------------------------------------------------------------------
// General UI
//

function showInfoDialog(text) {
    ui.infoText.innerHTML = text;
    hideOptionButtons();
    hidePairDialog();
    ui.pwDialog.style.display = "none";
    ui.ipDialog.style.display = "none";
    ui.detailsButton.style.display = "none";
    ui.clearButton.style.display = "inline";
}


function showPairDialog() {
    ui.pairDialog.style.display = "block";
    ui.infoText.innerHTML = "Number of LED blinks:";
    pair.blinkcode = [];
}


function hidePairDialog() {
    ui.settingsIcon.style.visibility = "visible";
    ui.pairBeginButton.style.display = "none";
    ui.pairCancelButton.style.display = "none";
    ui.pairDialog.style.display = "none";
    ui.pairStrength.innerHTML = "";
    pair.blinkcode = [];
}


function showNoWSDialog() {
    ui.infoText.innerHTML = 'Cannot find the Digital Bitbox PC app.';
    ui.connectOptionButtons.style.display = "inline";
    ui.pairManualButton.style.display = "inline";
    ui.clearButton.style.display = "inline";
    ui.settingsIcon.style.visibility = "hidden";
    hideOptionButtons();
}


function showIpDialog() {
    cancelClear();
    ui.infoText.innerHTML = "Enter the IP address of your PC";
    hideOptionButtons();
    ui.settingsIcon.style.visibility = "hidden";
    ui.ipDialog.style.display = "block";
    ui.ipText.value = pair.ip_saved;
}


function hideIpDialog() {
    ui.connectOptionButtons.style.display = "none";
    ui.pairManualButton.style.display = "none";
    ui.settingsIcon.style.visibility = "visible";
    ui.ipDialog.style.display = "none";
    ui.ipText.value = "";
}


function showPasswordDialog() {
    hideOptionButtons();
    ui.settingsIcon.style.visibility = "hidden";
    ui.pwDialog.style.display = "block";
    //ui.pwText.focus();
}


function hidePasswordDialog() {
    ui.settingsIcon.style.visibility = "visible";
    ui.pwDialog.style.display = "none";
    ui.pwText.value = "";
}


function showOptionButtons() {
    ui.optionButtons.style.display = "inline";
}


function hideOptionButtons() {
    ui.optionButtons.style.display = "none";
}


function showScanButton() {
    hideOptionButtons();
    ui.scanButton.style.display = "inline";
}


function displaySettings() {
    
    wsSend('Touched settings button');
    
    if (ui.optionButtons.style.display == "inline") {
        hideOptionButtons();
    } else {
        showOptionButtons();
        ui.scanButton.style.display = "none";
    }
}


// ----------------------------------------------------------------------------
// ECDH pairing UI
//

function blinkCodeStrength() {
    if (pair.blinkcode.length == 0) {
        ui.pairStrength.innerHTML = "";
    } else if (pair.blinkcode.length < 3) {
        ui.pairStrength.innerHTML = "Low strength";
        ui.pairStrength.style.color = DBB_COLOR_DANGER;
    } else if (pair.blinkcode.length < 5) {
        ui.pairStrength.innerHTML = "Medium strength";
        ui.pairStrength.style.color = DBB_COLOR_WARN;
    } else if (pair.blinkcode.length > 6) {
        ui.pairStrength.innerHTML = 'When ready to end:<br>Tap the touch button on the Digital Bitbox.</pre>';
        ui.pairStrength.style.color = DBB_COLOR_BLACK;
    } else {
        ui.pairStrength.innerHTML = "";
    }
}


function blinkPress1() { blinkPress(1); }
function blinkPress2() { blinkPress(2); }
function blinkPress3() { blinkPress(3); }
function blinkPress4() { blinkPress(4); }
function blinkPress(p) {
    pair.blinkcode.push(p);
    ui.infoText.innerHTML = '<b>' + Array(pair.blinkcode.length + 1).join(" * ") + '</b>';
    blinkCodeStrength();
}


function blinkDel() {
    if (pair.blinkcode.length == 0) {
        cancelClear();
    } else {
        pair.blinkcode.pop();
        if (pair.blinkcode.length == 0) {
            ui.infoText.innerHTML = "Number of LED blinks:";
        } else {
            ui.infoText.innerHTML = '<b>' + Array(pair.blinkcode.length + 1).join(" * ") + '</b>';
        }
    }
    blinkCodeStrength();
}


function pairEnter() {
    if (ws) {
        if (ws.readyState == ws.OPEN) {
            cancelClear();
            ui.settingsIcon.style.visibility = "hidden";
            ui.pairBeginButton.style.display = "inline";
            ui.pairCancelButton.style.display = "inline";
            ui.infoText.innerHTML = 'Your Digital Bitbox will begin to blink.<br><br><pre>- Count the number of blinks in each set.\n- Enter those numbers here.\n- Tap the touch button on the Digital Bitbox to end.</pre>';
            return; 
        }
    }
    
    if (navigator.connection.type != Connection.WIFI) {
        showInfoDialog('A WiFi connection was not found.'); 
        ui.pairManualButton.style.display = "inline";
        ui.settingsIcon.style.visibility = "hidden";
    } else {
        showNoWSDialog();
    }
}

function pairPc() {
    ui.pairBeginButton.style.display = "none";
    ui.pairCancelButton.style.display = "none";
    if (ws) {
        if (ws.readyState == ws.OPEN) {
            wsSend('{"ecdh":"' + ecdhPubkey() + '"}');
        }
    }
    showPairDialog();
}

function pairManual() {
    cancelClear();
    ui.settingsIcon.style.visibility = "hidden";
    ui.pairBeginButton.style.display = "inline";
    ui.pairCancelButton.style.display = "inline";
    
    var pubkey = ecdhPubkey();
        pubkey = Base58Check.encode(new Buffer(pubkey.toString('hex'), 'hex'));
    
    ui.infoText.innerHTML = 'Enter this in the PC app:<br><br>' +
                            '<span style="color: ' + DBB_COLOR_WARN + ';">' +
                            pubkey.slice(0, pubkey.length / 2) + '<br>' +
                            pubkey.slice(pubkey.length / 2) + '</span>' +
                            '<br><br><br>Then begin, and your Digital Bitbox will blink.<br><pre>' +
                            '- Count the number of blinks in each set.\n' +
                            '- Enter those numbers here.\n' +
                            '- Tap the touch button on the Digital Bitbox to end.</pre>';
    
    wsSend('{"ecdh":"manual"}');
}

function ipManual() {
    showIpDialog();
}

function setIP() {
    ws_opt.IP = ui.ipText.value;
    pair.ip_saved = ui.ipText.value;
    writeIp();
    cancelClear();
}

function pairStatus() {
    if (ui.clearButton.style.display == "inline"){
        cancelClear();
    } else {
        showInfoDialog('Digital Bitbox PC app connect at:<br>' + ws_opt.address + '<br>' + ws_opt.name);
    }
}


// ----------------------------------------------------------------------------
// Password UI
// 

function setKey() {
    ui.infoText.innerHTML = "";
    showPasswordDialog();
}


function forget() {
    ws_opt.IP = null;
    pair.key = "";
    pair.ip_saved = "";
    writeKey();
    writeIp();
    hideOptionButtons();
    showInfoDialog("Settings erased");
}


function saveKey() {
    try {
        pair.key = ui.pwText.value;
        writeKey();
        hidePasswordDialog();
        showInfoDialog("Password set");
    }
    catch(err) {
        ui.infoText.innerHTML = err.message;
        console.log(err.message);
    }
}
           

function cancelClear() {
    hidePasswordDialog();
    hidePairDialog();
    hideIpDialog();
    showInfoDialog("");
    ui.clearButton.style.display = "none";
    ui.scanButton.style.display = "none";
}


function loadFiles() {
	try {
        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function(dir) {
		    dir.getFile("keyfile.txt", {create:true}, function(file) {
			    pair.keyFile = file;
		        readKey(); 
            })
            dir.getFile("ipfile.txt", {create:true}, function(file) {
			    pair.ipFile = file;
		        readIp(); 
            })
	    })
    }
    catch(err) {
        ui.infoText.innerHTML = err.message;
        console.log(err.message);
    }
}


function readKey() {
    try {    
        pair.keyFile.file(function(file) {
            var reader = new FileReader();
            reader.onloadend = function(e) {
                pair.key = e.target.result;
            }
            reader.readAsText(file);
        })
        return pair.key; 
    }
    catch(err) {
        ui.infoText.innerHTML = err.message;
        console.log(err.message);
        return null;
    }
}


function writeKey() {
	try {
        if (!pair.keyFile) return;
        pair.keyFile.createWriter(function(fileWriter) {
            var blob = new Blob([pair.key], {type:"text/plain"});
            fileWriter.write(blob);
        })
    }
    catch(err) {
        ui.infoText.innerHTML = err.message;
        console.log(err.message);
    }
}


function readIp() {
    try {    
        pair.ipFile.file(function(file) {
            var reader = new FileReader();
            reader.onloadend = function(e) {
                pair.ip_saved = e.target.result;
            }
            reader.readAsText(file);
        })
        return pair.ip_saved; 
    }
    catch(err) {
        ui.infoText.innerHTML = err.message;
        console.log(err.message);
        return null;
    }
}


function writeIp() {
	try {
        if (!pair.ipFile) return;
        pair.ipFile.createWriter(function(fileWriter) {
            var blob = new Blob([pair.ip_saved], {type:"text/plain"});
            fileWriter.write(blob);
        })
    }
    catch(err) {
        ui.infoText.innerHTML = err.message;
        console.log(err.message);
    }
}


// ----------------------------------------------------------------------------
// Transaction UI
// 

function details()
{
    showInfoDialog("<pre>" + res_detail + "</pre>");
}


// ----------------------------------------------------------------------------
// Scan UI
// 

function startScan()
{
	cancelClear();
    try {
    cordova.plugins.barcodeScanner.scan(
		function (result)
        {
            parseData(result.text);
        }, 
		function (error) {
			console.log("Scanning failed: " + error);
		}
	)
    }
    catch(err) {
        ui.infoText.innerHTML = err.message;
        console.log(err.message);
    }

}


// ----------------------------------------------------------------------------
// Crypto
// 

function aes_cbc_b64_decrypt(ciphertext)
{
    var res;
    try {
        var ub64 = new Buffer(ciphertext, "base64").toString("binary");
        var iv   = new Buffer(ub64.slice(0, 16), "binary");
        var enc  = new Buffer(ub64.slice(16), "binary");
        var k    = new Buffer(pair.key, "hex");
        var decipher = Crypto.createDecipheriv("aes-256-cbc", k, iv);
        var dec = decipher.update(enc) + decipher.final();
        res = dec.toString("utf8");
    }
    catch(err) {
        console.log(err);
        res = ciphertext;
    }
    
    return res;
}


function aes_cbc_b64_encrypt(plaintext)
{
    try {
        var iv = Crypto.pseudoRandomBytes(16);
        var k  = new Buffer(pair.key, "hex");
        var cipher = Crypto.createCipheriv("aes-256-cbc", k, iv);
        var ciphertext = Buffer.concat([iv, cipher.update(plaintext), cipher.final()]);
        return ciphertext.toString("base64");
    }
    catch(err) {
        console.log(err);
    }
}


function ecdhPubkey() {
    ecdh.generateKeys();
    return ecdh.getPublicKey('hex','compressed'); // 33 bytes
}    


function multisigHash(script) {
    var hash = Crypto.createHash('sha256')
               .update(new Buffer(script, 'hex'))
               .digest();
    hash = Ripemd160(hash);
    if (COINNET === 'livenet') {
        hash = Base58Check.encode(new Buffer('05' + hash.toString('hex'), 'hex'));
    } else if (COINNET === 'testnet') {
        hash = Base58Check.encode(new Buffer('c4' + hash.toString('hex'), 'hex'));
    } else {
        hash = 0;
    }
    return hash;
}


function multisig1of1(publickey) {
    var pushbytes = (publickey.length  / 2).toString(16);
    var script = OP_1 + pushbytes + publickey + OP_1 + OP_CHECKMULTISIG;
    return multisigHash(script);
}


function getInputs(transaction, sign) {
    var blockWorker = new Worker("js/blockWorker.js");
    pair.inputAddresses = [];
    for (var i = 0; i < transaction.inputs.length; i++) {
        var script = transaction.inputs[i].script;
            script = script.chunks[script.chunks.length - 1].buf;
        var addr = multisigHash(script);
        blockWorker.postMessage("https://blockexplorer.com/api/addr/" + addr + "/balance");
        blockWorker.postMessage("https://insight.bitpay.com/api/addr/" + addr + "/balance");
        blockWorker.postMessage("https://blockchain.info/q/addressbalance/" + addr);
        blockWorker.onmessage = function(e) {
            var url = e.data[1].split('/');
            var address;
            for (var i = 0; i < url.length; i++) {
                if (url[i].length === 34)
                    address = url[i]; 
            }
           
            for (var i = 0; i < pair.inputAddresses.length; i++) {
                // skip if already got the balance 
                if (address === pair.inputAddresses[i].address)
                    return;
            }
                    
            var input = {};
            input.address = address;
            input.balance = e.data[0];
            pair.inputAddresses.push(input);
            
            if (pair.inputAddresses.length === transaction.inputs.length) {
                blockWorker.terminate();
                console.log('Got all address balances.', pair.inputAddresses.length);
                process_verify_transaction(transaction, sign);
            }
        };
    }
}



// ----------------------------------------------------------------------------
// Parse input
// 

function process_verify_transaction(transaction, sign) 
{    
    var res_short = '',
        total_in = 0, 
        total_out = 0,
        err = '',
        res = '';

    res_detail = '';

    // Get outputs and amounts
    res_detail += "\nOutputs:\n";
    for (var i = 0; i < transaction.outputs.length; i++) {
        var address, amount, present;
        address = transaction.outputs[i].script
            .toAddress(COINNET).toString();

        amount = transaction.outputs[i].satoshis;
        total_out += amount / SAT2BTC;

        // Check if the output address is a change address
        present = false;
        for (var j = 0; j < sign.checkpub.length; j++) {
            var pubk = sign.checkpub[j].pubkey; 
            var checkaddress = multisig1of1(pubk);
            if (checkaddress === address) {
                present = sign.checkpub[j].present; 
            }
        }
        
        if (!present || transaction.outputs.length == 1) {
            res = address + "  " + amount / SAT2BTC + " BTC\n";
            res_detail += '<span style="color: ' + DBB_COLOR_WARN + ';">' + res + '</span>';
            res_short += amount / SAT2BTC + " BTC\n" + address + "\n\n";
        } else {
            res = address + "  " + amount / SAT2BTC + " BTC (change address)\n";
            res_detail += '<span style="color: ' + DBB_COLOR_SAFE + ';">' + res + '</span>';
        }
    }

    if (res_short == "")
        res_short = "\nMoving:\n\n" + total_out + " BTC\n(internally)\n\n";
    else
        res_short = "\nSending:\n\n" + res_short;
       

    // Get input addresses and balances
    res_detail += "\nInputs:\n";
    for (var i = 0; i < pair.inputAddresses.length; i++) {
        var address = pair.inputAddresses[i].address;
        var balance = pair.inputAddresses[i].balance;
        res = address + "  " + balance / SAT2BTC + " BTC\n";
        res_detail += '<span style="color: ' + DBB_COLOR_SAFE + ';">' + res + '</span>';
        total_in += balance / SAT2BTC;
    }


    // Calculate fee (inputs - outputs)
    res_detail += '\nFee:\n';
    res = (total_in - total_out).toFixed(8) + ' BTC\n';
    if ((total_in - total_out) > WARNFEE) {
        var errmsg = 'WARNING: High fee!';
        err += '<span style="color: ' + DBB_COLOR_DANGER + ';">' + errmsg + '<br><br></span>';
        res_detail += '<span style="color: ' + DBB_COLOR_DANGER + ';">' + res + '/span>';
    } else {
        res_detail += '<span style="color: ' + DBB_COLOR_WARN + ';">' + res + '</span>';
    }
    
    res = "\nFee: " + (total_in - total_out).toFixed(8) + " BTC\n\n";
    if ((total_in - total_out) > WARNFEE) {
        res_short += '<span style="color: ' + DBB_COLOR_DANGER + ';">' + res + '<br><br></span>';
    } else {
        res_short += '<span style="color: ' + DBB_COLOR_BLACK + ';">' + res + '<br><br></span>';
    }
            
    if (typeof sign.pin == "string")
        res_short += "\n\nLock code:  " + sign.pin;

    console.log(res_short);
    showInfoDialog("<pre>" + res_short + "</pre>");
    ui.detailsButton.style.display = "inline";


    // Verify that input hashes match meta utx
    res_detail += "\nHashes:\n";
    for (var j = 0; j < sign.data.length; j++) {
        var present = false;
        for (var i = 0; i < transaction.inputs.length; i++) {
            var nhashtype = Bitcore.crypto.Signature.SIGHASH_ALL;
            var script = transaction.inputs[i].script
                script = script.chunks[script.chunks.length - 1].buf; // redeem script is 2nd to last chunk
            
            var sighash = Bitcore.Transaction.sighash
                .sighash(transaction, nhashtype, i, script);
           
            if (sign.data[j].hash === Reverse(sighash).toString('hex'))
                present = true; 
        }

        if (present === false) {
            var errmsg = 'WARNING: Unknown data being signed!';
            err += '<span style="color: ' + DBB_COLOR_DANGER + ';">' + errmsg + '<br><br></span>';
            res = "Unknown: " + sign.data[j].hash;
            res_detail += '<span style="color: ' + DBB_COLOR_DANGER + ';">' + res + '</span>';
        } else {
            res = sign.data[j].hash;
            res_detail += '<span style="color: ' + DBB_COLOR_SAFE + ';">' + res + '</span>';
        }
    }

    if (typeof sign.pin == "string")
        res_detail += "\nLock code:  " + sign.pin;
    
    // Extra information
    console.log("2FA message received:\n" + JSON.stringify(sign, undefined, 4));
    console.log(res_detail);
    console.log(err);
            
    if (err != '')
        showInfoDialog("<pre>" + err + res_detail + "</pre>");
        
}


function process_2FA_pairing(parse) 
{    
    var ciphertext = parse.verifypass.ciphertext;
    var pubkey = parse.verifypass.ecdh;
    var ecdh_secret = ecdh.computeSecret(pubkey, 'hex', 'hex');
    
    pair.key = Crypto.createHash('sha256').update(new Buffer(ecdh_secret, 'hex')).digest('hex');
    pair.key = Crypto.createHash('sha256').update(new Buffer(pair.key, 'hex')).digest('hex');
    var k = new Buffer(pair.key, "hex");
    for (var i = 0; i < pair.blinkcode.length; i++) {
        k[i % 32] ^= pair.blinkcode[i]; 
    }
    pair.key = k.toString('hex');
    pair.key = Crypto.createHash('sha256').update(new Buffer(pair.key, 'ascii')).digest('hex');
    pair.key = Crypto.createHash('sha256').update(new Buffer(pair.key, 'hex')).digest('hex');

    writeKey();
    
    if (aes_cbc_b64_decrypt(ciphertext) === 'Digital Bitbox 2FA')
        parse = "Successfully paired.";
    else 
        parse = "Pairing failed!";
    
    return parse;
}
  

function process_verify_address(plaintext) 
{    
    var parse = Base58Check.decode(plaintext).slice(-33).toString('hex');
    parse = multisig1of1(parse);
    if (!parse) {
        return 'Error: Coin network not defined.';
    }
    return "<pre>Receiving address:\n\n" + parse + "\n\n</pre>";
}


function parseData(data)
{
    try {
        
        if (data.slice(0,2).localeCompare('QS') == 0) {
            var seqNumber = data[2];
            var seqTotal = data[3];
            pair.QRtext[seqNumber] = data.substring(4);

            if (pair.QRtext.length != seqTotal) {
                showInfoDialog('continue scanning');
                ui.clearButton.style.display = "none";
                setTimeout(startScan, TIMEOUT);
                return; 
            }
            
            for (var i = 0; i < seqTotal; i++) {
                if (pair.QRtext[i] === undefined) {
                    showInfoDialog('continue scanning');
                    ui.clearButton.style.display = "none";
                    setTimeout(startScan, TIMEOUT);
                    return; 
                }
            }
            
            data = pair.QRtext.join('');
            pair.QRtext = [];
        }

        
        data = JSON.parse(data);


        if (typeof data.ip == "string") {
            console.log('Setting websocket IP', data.ip);
            ui.ipText.value = data.ip;
            setIP();
            return;
        } 
        
        if (typeof data.verifypass == "object") {
            showInfoDialog(process_2FA_pairing(data));
            return;
        } 

        if (typeof data.echo == "string") {
            // Echo verification
            var ciphertext = data.echo;
            var plaintext = aes_cbc_b64_decrypt(ciphertext);
            
            if (plaintext === ciphertext) {
                showInfoDialog('Could not parse:<br><br>' + JSON.stringify(plaintext, undefined, 4));
                return; 
            }
            
            if (plaintext.slice(0,4).localeCompare('xpub') == 0) {
                showInfoDialog(process_verify_address(plaintext));
                return;
            }
            
            if (typeof JSON.parse(plaintext).sign == "object") {
                var sign = JSON.parse(plaintext).sign;
                var transaction = new Bitcore.Transaction(sign.meta);
                if (typeof JSON.parse(plaintext).pin == "string")
                    sign.pin = JSON.parse(plaintext).pin;
                    
                getInputs(transaction, sign);
                return;
            }
                
            showInfoDialog('No operation for:<br><br>' + JSON.stringify(data, undefined, 4));
            return;
        }

        showInfoDialog('Could not parse:<br><br>' + JSON.stringify(data, undefined, 4));
        console.log('Could not parse data.');
    
    }
    catch(err) {
        console.log(err);
        showInfoDialog(data);
    }

    if (data == "")
        showInfoDialog("--");

}


