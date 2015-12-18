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


var ws = null,
    wsIp = null,
    wsAddr = '',
    wsName = '',
    wsPollInterval = 1000; // msec

var pairIcon,
    pairDialog,
    pwDialog,
    ipDialog,
    pwText,
    ipText,
    clearButton,
    detailsButton,
    pairBeginButton,
    pairCancelButton,
    connectOptionButtons,
    scanIpButton,
    settingsIcon,
    optionButtons,
    scanButton, 
    infoTextDiv,
    pairStrengthDiv;

var ecdh = Crypto.createECDH('secp256k1'),
    blinkcode = [],
    ipFile = null,
    keyFile = null,
    ip_saved = "",
    key;

var QRtext = [],
    inputAddresses = [],
    res_detail = '';
        


// ----------------------------------------------------------------------------
// Startup
// 

document.addEventListener("deviceready", init, false);

function init()
{
	document.querySelector("#clearButton").addEventListener("touchstart", cancelClear, false);
    document.querySelector("#cancelButton").addEventListener("touchstart", cancelClear, false);
    document.querySelector("#cancelIpButton").addEventListener("touchstart", cancelClear, false);
    //document.querySelector("#changepwButton").addEventListener("touchstart", setKey, false);
    document.querySelector("#submitpwButton").addEventListener("touchstart", saveKey, false);
    document.querySelector("#submitIpButton").addEventListener("touchstart", setIP, false);
    document.querySelector("#forgetpwButton").addEventListener("touchstart", forget, false);
    document.querySelector("#settingsIcon").addEventListener("touchstart", displaySettings, false);
    document.querySelector("#detailsButton").addEventListener("touchstart", details, false);
    document.querySelector("#pairOptionButton").addEventListener("touchstart", pairEnter, false);
    document.querySelector("#pairBeginButton").addEventListener("touchstart", pairPc, false);
    document.querySelector("#pairCancelButton").addEventListener("touchstart", cancelClear, false);
    document.querySelector("#pairManualButton").addEventListener("touchstart", pairManual, false);
    document.querySelector("#scanIpButton").addEventListener("touchstart", startScan, false);
    document.querySelector("#pairIcon").addEventListener("touchstart", pairStatus, false);
    document.querySelector("#showScanButton").addEventListener("touchstart", startScan, false);
    //document.querySelector("#showScanButton").addEventListener("touchstart", showScanButton, false);
    //document.querySelector("#scanButton").addEventListener("touchstart", startScan, false);
    
    
    document.querySelector("#blinkDelButton").addEventListener("touchstart", blinkDel, false);
    document.querySelector("#blink1Button").addEventListener("touchstart", blinkPress1, false);
    document.querySelector("#blink2Button").addEventListener("touchstart", blinkPress2, false);
    document.querySelector("#blink3Button").addEventListener("touchstart", blinkPress3, false);
    document.querySelector("#blink4Button").addEventListener("touchstart", blinkPress4, false);
    
    pwText = document.getElementById("pwText");
    ipText = document.getElementById("ipText");
    pwDialog = document.getElementById("pwDialog");
    ipDialog = document.getElementById("ipDialog");
	pairStrengthDiv = document.querySelector("#pairStrength");
    pairIcon = document.getElementById("pairIcon");
    pairDialog = document.getElementById("pairDialog");
	infoTextDiv = document.querySelector("#infoText");
    clearButton = document.getElementById("clearButton");
    detailsButton = document.getElementById("detailsButton");
    pairBeginButton = document.getElementById("pairBeginButton");
    pairCancelButton = document.getElementById("pairCancelButton");
    connectOptionButtons = document.getElementById("connectOptionButtons");
    scanIpButton = document.getElementById("scanIpButton");
    settingsIcon = document.getElementById("settingsIcon");
    optionButtons = document.getElementById("optionButtons");
    scanButton = document.getElementById("scanButton");

    loadFiles();
    setInterval(wsFind, wsPollInterval);
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
    if(!ws || ws.readyState == ws.CLOSED) {
        console.log('WebSocket found at ', wsAddr);
        
        ws = new WebSocket(wsAddr);
    
        ws.onopen = function () {
            pairIcon.style.visibility = "visible";
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
            pairIcon.style.visibility = "hidden";
            wsAddr = '';
            wsName = '';
        };
    }
};


function wsSend(message) {
    if(ws) {
        if(ws.readyState == ws.OPEN) {
            ws.send(message);
        }
    }
}


var alternate = 0;
function wsFind() {
    if (wsIp) {
        wsAddr = 'ws://' + wsIp + ':' + PORT;
        wsName = 'Manually entered';
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
    wsAddr = 'ws://' + obj.service.addresses[0] + ':' + obj.service.port;
    //wsAddr = 'ws://' + obj.service.server + ':' + obj.service.port;
    wsName = obj.service.name;
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
    infoTextDiv.innerHTML = text;
    hideOptionButtons();
    hidePairDialog();
    pwDialog.style.display = "none";
    ipDialog.style.display = "none";
    detailsButton.style.display = "none";
    clearButton.style.display = "inline";
}


function showPairDialog() {
    pairDialog.style.display = "block";
    infoTextDiv.innerHTML = "Number of LED blinks:";
    blinkcode = [];
}


function hidePairDialog() {
    settingsIcon.style.visibility = "visible";
    pairBeginButton.style.display = "none";
    pairCancelButton.style.display = "none";
    pairDialog.style.display = "none";
    pairStrengthDiv.innerHTML = "";
    blinkcode = [];
}


function showNoWSDialog() {
    infoTextDiv.innerHTML = 'Cannot find the Digital Bitbox PC app.';
    connectOptionButtons.style.display = "inline";
    clearButton.style.display = "inline";
    settingsIcon.style.visibility = "hidden";
    hideOptionButtons();
}


function showIpDialog() {
    cancelClear();
    infoTextDiv.innerHTML = "Enter the IP address of your PC";
    hideOptionButtons();
    settingsIcon.style.visibility = "hidden";
    ipDialog.style.display = "block";
    ipText.value = ip_saved;
}


function hideIpDialog() {
    connectOptionButtons.style.display = "none";
    settingsIcon.style.visibility = "visible";
    ipDialog.style.display = "none";
    ipText.value = "";
}


function showPasswordDialog() {
    hideOptionButtons();
    settingsIcon.style.visibility = "hidden";
    pwDialog.style.display = "block";
    //pwText.focus();
}


function hidePasswordDialog() {
    settingsIcon.style.visibility = "visible";
    pwDialog.style.display = "none";
    pwText.value = "";
}


function showOptionButtons() {
    optionButtons.style.display = "inline";
}


function hideOptionButtons() {
    optionButtons.style.display = "none";
}


function showScanButton() {
    hideOptionButtons();
    scanButton.style.display = "inline";
}


function displaySettings() {
    
    wsSend('Touched settings button');
    
    if(optionButtons.style.display == "inline") {
        hideOptionButtons();
    } else {
        showOptionButtons();
        scanButton.style.display = "none";
    }
}


// ----------------------------------------------------------------------------
// ECDH pairing UI
//

function blinkCodeStrength() {
    if (blinkcode.length == 0) {
        pairStrengthDiv.innerHTML = "";
    } else if (blinkcode.length < 3) {
        pairStrengthDiv.innerHTML = "Low strength";
        pairStrengthDiv.style.color = DBB_COLOR_DANGER;
    } else if (blinkcode.length < 5) {
        pairStrengthDiv.innerHTML = "Medium strength";
        pairStrengthDiv.style.color = DBB_COLOR_WARN;
    } else if (blinkcode.length > 6) {
        pairStrengthDiv.innerHTML = 'When ready to end:<br>Tap the touch button on the Digital Bitbox.</pre>';
        pairStrengthDiv.style.color = DBB_COLOR_BLACK;
    } else {
        pairStrengthDiv.innerHTML = "";
    }
}


function blinkPress1() { blinkPress(1); }
function blinkPress2() { blinkPress(2); }
function blinkPress3() { blinkPress(3); }
function blinkPress4() { blinkPress(4); }
function blinkPress(p) {
    blinkcode.push(p);
    infoTextDiv.innerHTML = '<b>' + Array(blinkcode.length + 1).join(" * ") + '</b>';
    blinkCodeStrength();
}


function blinkDel() {
    if (blinkcode.length == 0) {
        cancelClear();
    } else {
        blinkcode.pop();
        if (blinkcode.length == 0) {
            infoTextDiv.innerHTML = "Number of LED blinks:";
        } else {
            infoTextDiv.innerHTML = '<b>' + Array(blinkcode.length + 1).join(" * ") + '</b>';
        }
    }
    blinkCodeStrength();
}


function pairEnter() {
    if(ws) {
        if(ws.readyState == ws.OPEN) {
            hideOptionButtons();
            clearButton.style.display = "none" ;
            settingsIcon.style.visibility = "hidden";
            pairBeginButton.style.display = "inline";
            pairCancelButton.style.display = "inline";
            infoTextDiv.innerHTML = 'Your Digital Bitbox will begin to blink.<br><br><pre>- Count the number of blinks in each set.\n- Enter those numbers here.\n- Tap the touch button on the Digital Bitbox to end.</pre>';
            return; 
        }
    }
    
    if (navigator.connection.type != Connection.WIFI) {
        showInfoDialog('A WiFi connection is needed for pairing.'); 
    } else {
        showNoWSDialog();
    }
}

function pairPc() {
    pairBeginButton.style.display = "none";
    pairCancelButton.style.display = "none";
    if(ws) {
        if(ws.readyState == ws.OPEN) {
            ecdhPubkey();
            showPairDialog();
            return; 
        }
    }
    showNoWSDialog();
}

function pairManual() {
    showIpDialog();
}

function setIP() {
    wsIp = ipText.value;
    ip_saved = ipText.value;
    writeIp();
    cancelClear();
}

function pairStatus() {
    if(clearButton.style.display == "inline"){
        cancelClear();
    } else {
        showInfoDialog('Digital Bitbox PC app connect at:<br>' + wsAddr + '<br>' + wsName);
    }
}


// ----------------------------------------------------------------------------
// Password UI
// 

function setKey() {
    infoTextDiv.innerHTML = "";
    showPasswordDialog();
}


function forget() {
    wsIp = null;
    key = "";
    ip_saved = "";
    writeKey();
    writeIp();
    hideOptionButtons();
    showInfoDialog("Settings erased");
}


function saveKey() {
    try {
        key = pwText.value;
        writeKey();
        hidePasswordDialog();
        showInfoDialog("Password set");
    }
    catch(err) {
        infoTextDiv.innerHTML = err.message;
        console.log(err.message);
    }
}
           

function cancelClear() {
    hidePasswordDialog();
    hidePairDialog();
    hideIpDialog();
    showInfoDialog("");
    clearButton.style.display = "none";
    scanButton.style.display = "none";
}


function loadFiles() {
	try {
        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function(dir) {
		    dir.getFile("keyfile.txt", {create:true}, function(file) {
			    keyFile = file;
		        readKey(); 
            })
            dir.getFile("ipfile.txt", {create:true}, function(file) {
			    ipFile = file;
		        readIp(); 
            })
	    })
    }
    catch(err) {
        infoTextDiv.innerHTML = err.message;
        console.log(err.message);
    }
}


function readKey() {
    try {    
        keyFile.file(function(file) {
            var reader = new FileReader();
            reader.onloadend = function(e) {
                key = e.target.result;
            }
            reader.readAsText(file);
        })
        return key; 
    }
    catch(err) {
        infoTextDiv.innerHTML = err.message;
        console.log(err.message);
        return null;
    }
}


function writeKey() {
	try {
        if(!keyFile) return;
        keyFile.createWriter(function(fileWriter) {
            //fileWriter.seek(fileWriter.length); // append
            var blob = new Blob([key], {type:"text/plain"});
            fileWriter.write(blob);
        })
    }
    catch(err) {
        infoTextDiv.innerHTML = err.message;
        console.log(err.message);
    }
}


function readIp() {
    try {    
        ipFile.file(function(file) {
            var reader = new FileReader();
            reader.onloadend = function(e) {
                ip_saved = e.target.result;
            }
            reader.readAsText(file);
        })
        return ip_saved; 
    }
    catch(err) {
        infoTextDiv.innerHTML = err.message;
        console.log(err.message);
        return null;
    }
}


function writeIp() {
	try {
        if(!ipFile) return;
        ipFile.createWriter(function(fileWriter) {
            //fileWriter.seek(fileWriter.length); // append
            var blob = new Blob([ip_saved], {type:"text/plain"});
            fileWriter.write(blob);
        })
    }
    catch(err) {
        infoTextDiv.innerHTML = err.message;
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
        infoTextDiv.innerHTML = err.message;
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
        var k    = new Buffer(key, "hex");
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
        var k  = new Buffer(key, "hex");
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
    var ecdh_pubkey = ecdh.getPublicKey('hex','compressed'); // 33 bytes
    var msg = '{"ecdh":"' + ecdh_pubkey + '"}';
    wsSend(msg);   
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
    inputAddresses = [];
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
           
            for (var i = 0; i < inputAddresses.length; i++) {
                // skip if already got the balance 
                if (address === inputAddresses[i].address)
                    return;
            }
                    
            var input = {};
            input.address = address;
            input.balance = e.data[0];
            inputAddresses.push(input);
            
            if (inputAddresses.length === transaction.inputs.length) {
                blockWorker.terminate();
                console.log('Got all address balances.', inputAddresses.length);
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
    for (var i = 0; i < inputAddresses.length; i++) {
        var address = inputAddresses[i].address;
        var balance = inputAddresses[i].balance;
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
    detailsButton.style.display = "inline";


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
    
    key = Crypto.createHash('sha256').update(new Buffer(ecdh_secret, 'hex')).digest('hex');
    key = Crypto.createHash('sha256').update(new Buffer(key, 'hex')).digest('hex');
    var k = new Buffer(key, "hex");
    for (var i = 0; i < blinkcode.length; i++) {
        k[i % 32] ^= blinkcode[i]; 
    }
    key = k.toString('hex');
    key = Crypto.createHash('sha256').update(new Buffer(key, 'ascii')).digest('hex');
    key = Crypto.createHash('sha256').update(new Buffer(key, 'hex')).digest('hex');

    writeKey();
    
    if (aes_cbc_b64_decrypt(ciphertext) === 'Digital Bitbox 2FA')
        parse = "Successfully paired.";
    else 
        parse = "Pairing failed!";
    
    return parse;
}
  

function process_verify_address(plaintext, parse) 
{    
    if (!(parse.xpub === plaintext)) {
        return 'Error: Addresses do not match!';
    } else {
        parse = Base58Check.decode(plaintext).slice(-33).toString('hex');
        parse = multisig1of1(parse);
        if (!parse) {
            return 'Error: Coin network not defined.';
        }
        return "<pre>Receiving address:\n\n" + parse + "\n\n</pre>";
    }
}


function parseData(data)
{
    try {
        
        if (data.slice(0,2).localeCompare('QS') == 0) {
            var seqNumber = data[2];
            var seqTotal = data[3];
            QRtext[seqNumber] = data.substring(4);

            if (QRtext.length != seqTotal) {
                showInfoDialog('Scan next QR code');
                startScan();
                return; 
            }
                
            for (var i = 0; i < seqTotal; i++) {
                if (QRtext[i] === undefined) {
                    showInfoDialog('Scan next QR code');
                    startScan();
                    return; 
                }
            }
            
            data = QRtext.join('');
            QRtext = [];
        }

        
        data = JSON.parse(data);


        if (typeof data.ip == "string") {
            console.log('Setting websocket IP', data.ip);
            ipText.value = data.ip;
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
                showInfoDialog(process_verify_address(plaintext, data));
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
        //showInfoDialog("Unknown error. Data received was:<br><br>" + data);
        showInfoDialog(data);
    }

    if (data == "")
        showInfoDialog("--");

}


