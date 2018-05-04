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
var bech32 = require('bech32')
var Reverse = require("buffer-reverse");

var Display = require("./display.js");
var Update = require("./update.js");
require("./global.js");

// map of coin name to Bitcore network names.
var coinNet = {
    'btc': 'mainnet',
    'tbtc': 'testnet',
    'ltc': 'ltc-mainnet',
    'tltc': 'ltc-testnet'
};
var bech32Prefix = {
    'btc': 'bc',
    'tbtc': 'tb',
    'ltc': 'ltc',
    'tltc': 'tltc'
};

Bitcore.Networks.add({
  name: 'ltc-livenet',
  alias: 'ltc-mainnet',
  pubkeyhash: 0x30,
  privatekey: 0xB0,
  scripthash: 0x32,
  xpubkey: 0x0488b21e,
  xprivkey: 0x0488ade4,
  networkMagic: 0xdbb6c0fb,
  port: 9333,
  dnsSeeds: []
});

Bitcore.Networks.add({
  name: 'ltc-testnet',
  alias: 'ltc-testnet',
  pubkeyhash: 0x6f,
  privatekey: 0xef,
  scripthash: 0xc4,
  xpubkey: 0x043587cf,
  xprivkey: 0x04358394,
  networkMagic: 0xf1c8d2fd,
  port: 19335,
  dnsSeeds: []
});



var PORT = 25698;
var WARNFEE = 500000; // satoshis TODO update
var VERIFYPASS_CRYPT_TEST = 'Digital Bitbox 2FA';

var DBB_COLOR_SAFE = "#0C0",
    DBB_COLOR_WARN = "#880",
    DBB_COLOR_DANGER = "#C00",
    DBB_COLOR_BLACK = "#000";

var OP_CHECKMULTISIG = 'ae',
    OP_1 = '51';

var ui = {
    header: null,
    waitingDialog: null,
    spinnerDialog: null,
    serverUrlDialog: null,
    serverUrlText: null,
    optionCheckUpdateButton: null,
    //optionServerUrlChangeButton: null,
    serverUrlSubmitButton: null,
    serverUrlRestoreDefaultButton: null,
    serverErrorSettingsButton: null,
    serverErrorCancelButton: null,
    serverErrorDialog: null,
    checkUpdateDialog: null,
    checkUpdateText: null,
    checkUpdateUrlFollowButton: null,
    checkUpdateCloseButton: null,
    qrSequenceDialog: null,
    qrSequenceText: null,
    randomNumberDialog: null,
    randomNumber: null,
    randomNumberButton: null,
    receiveDialog: null,
    receiveAddress: null,
    receiveScanButton: null,
    connectScanButton: null,
    receiveClearButton: null,
    sendDialog: null,
    sendAmount: null,
    sendAddress: null,
    sendDetails: null,
    sendError: null,
    sendCancelButton: null,
    sendDetailsButton: null,
    sendUnlockedMode: null,
    sendLockedMode: null,
    lockSendAcceptButton: null,
    lockSendCancelButton: null,
    lockSendDetailsButton: null,
    blinkButtons: null,
    blink1Button: null,
    blink2Button: null,
    blink3Button: null,
    blink4Button: null,
    connectCheckDialog: null,
    connectCheck: null,
    connectPcDialog: null,
    pairDbbDialog: null,
    pairChallengeDialog: null,
    pairSuccessDialog: null,
    pairSuspiciousDialog: null,
    pairUserCancelledDialog: null,
    pairFailDialog: null,
    //pairManualButton: null,
    pairBeginButton: null,
    // pairChallengeReadyButton: null,
    pairChallengeNextButton: null,
    pairChallengeFinishButton: null,
    pairChallengeCancelButton: null,
    pairChallengeProgress: null,
    pairChallengeContinueNote: null,
    pairSuccessButton: null,
    pairExistsDialog: null,
    pairExistsContinueButton: null,
    parseErrorDialog: null,
    parseErrorCancelButton: null,
    txErrorDialog: null,
    txErrorCancelButton: null,
    bitcoinUriDialog: null,
    bitcoinUriAddress: null,
    bitcoinUriAmount: null,
    bitcoinUriClearButton: null,
    optionsIcon: null,
    optionScanButton: null,
    optionDisconnectButton: null,
    disconnectWarningDialog: null,
    disconnectButton: null,
    cancelDisconnectButton: null,
    disconnectWarningCheckbox: null,
    optionLegacyButton: null,
    pairSuspiciousDisconnectButton: null,
    pairFailDisconnectButton: null,
    pairExistsDisconnectButton: null,
    pairUserCancelledDisconnectButton: null,
    parseErrorDisconnectButton: null,
    txErrorDisconnectButton: null,
    splashScreen: null,
    optionsSlider: null,
};

var dialog = {};

var ecdh = Crypto.createECDH('secp256k1');

var connectCheckingText = '<i class="fa fa-minus fa-spin fa-2x"></i><br><br><br>Checking connection...',
    connectNoInternetText = 'No internet connection.';

var pair = {
    blinkcode: [],
    serverFile: null,
    QRtext: [],
    blockExplorerError: false,
    prevOutputs: [],
};

var update_server = {
    reply: {message: '', url: '', version: ''},
};


var localData = {
    serverURL: "",
    channelID: "",
    // encrypts communication between Desktop app and mobile
    encryptionKey: "",
    // authenticates communication between Desktop app and mobile
    authenticationKey: "",
    // encrypts communication between BitBox and mobile
    bitboxEncryptionKey: "",
    // authenticates communication between BitBox and mobile
    bitboxAuthenticationKey: "",
    bitpos: 0,
    bytepos: 0,
};

var localDataFile = null;
var tx_details = "";
var tx_lock_pin = "";

var server_poll_pause = false,
    verification_in_progress = false,
    connect_option_buttons_disabled = false,
    pairChallengeFinished = true;

// ----------------------------------------------------------------------------
// Startup
//
document.addEventListener("deviceready", init, false);

document.addEventListener("backbutton", onBackKeyDown, false);

function onBackKeyDown() {
    if (!pairChallengeFinished) {
        disconnect();
    } else {
        startUp();
    }
}

function init()
{
    /*
    // Automatically create ui object from IDs in camelCase format
    var ids = document.querySelectorAll('[id]');
    Array.prototype.forEach.call( ids, function( element, i ) {
        var id = element.id;
        id = id.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
        ui[id] = element;
        if (id.includes('Dialog'))
            dialog[id.replace('Dialog', '')] = element;
    });
    */

    dialog = Display.initDialogs(ui)

    // Add visual feedback for touches
    var elements = document.getElementsByClassName('buttonSimple');
    Array.prototype.filter.call(elements, function(e){
        e.addEventListener("touchstart", function(){ Display.touchStart(e) }, false);
        e.addEventListener("touchend", function(){ Display.touchEnd(e) }, false);
    });

    Display.registerTouch(ui.header, hideOptionButtons);
    Display.registerTouch(ui.optionsIcon, toggleOptions);
    Display.registerTouch(ui.optionCheckUpdateButton, function(){ checkUpdatePost(true) });
    //Display.registerTouch(ui.optionServerUrlChangeButton, serverUrl);
    Display.registerTouch(ui.serverUrlSubmitButton, serverUrlSubmit);
    Display.registerTouch(ui.serverUrlRestoreDefaultButton, serverUrlRestoreDefault);
    Display.registerTouch(ui.serverErrorSettingsButton, serverUrl);
    Display.registerTouch(ui.serverErrorCancelButton, serverUrlCancel);
    Display.registerTouch(ui.checkUpdateUrlFollowButton, function() { Update.followUrl(update_server.reply.url, waiting); });
    Display.registerTouch(ui.checkUpdateCloseButton, waiting);
    Display.registerTouch(ui.randomNumberButton, randomNumberClear);
    Display.registerTouch(ui.receiveScanButton, startScan);
    Display.registerTouch(ui.connectScanButton, startScan);
    Display.registerTouch(ui.receiveClearButton, waiting);
    Display.registerTouch(ui.sendCancelButton, waiting);
    Display.registerTouch(ui.sendDetailsButton, sendDetails);
    Display.registerTouch(ui.lockSendAcceptButton, sendLockPin);
    Display.registerTouch(ui.lockSendCancelButton, sendLockCancel);
    Display.registerTouch(ui.lockSendDetailsButton, sendDetails);
    //Display.registerTouch(ui.pairManualButton, pairManual);
    Display.registerTouch(ui.pairBeginButton, pairBegin);
    // Display.registerTouch(ui.pairChallengeReadyButton, pairChallengeNext);
    Display.registerTouch(ui.pairChallengeNextButton, pairChallengeNext);
    Display.registerTouch(ui.pairChallengeFinishButton, pairChallengeFinish);

    Display.registerTouch(ui.pairChallengeCancelButton, pairChallengeCancel);
    Display.registerTouch(ui.pairSuccessButton, waiting);
    Display.registerTouch(ui.pairExistsContinueButton, waiting);
    Display.registerTouch(ui.parseErrorCancelButton, waiting);
    Display.registerTouch(ui.txErrorCancelButton, waiting);
    Display.registerTouch(ui.optionDisconnectButton, function() {
        let warningText = document.getElementById('disconnect-warning-checkbox-error');
        warningText.style.display = "none";
        let checkbox = document.getElementById('disconnect-warning-checkbox');
        checkbox.checked = false;
        Display.displayDialog(ui.disconnectWarningDialog, dialog);
        hideOptionButtons();
    });
    Display.registerTouch(ui.disconnectButton, function() {
        let checkbox = document.getElementById('disconnect-warning-checkbox');
        if (checkbox.checked) {
            console.log("Disconnecting...");
            disconnect();
        } else {
            let warningText = document.getElementById('disconnect-warning-checkbox-error');
            warningText.style.display = "block";
        }
    });
    Display.registerTouch(ui.cancelDisconnectButton, function() {
        Display.displayDialog(ui.waitingDialog, dialog);
    });
    Display.registerTouch(ui.optionLegacyButton, function() {
        resetState();
        writeLocalData(function() {
            window.location.href = "index.html"; 
        });
    });
    Display.registerTouch(ui.pairSuspiciousDisconnectButton, disconnect);
    Display.registerTouch(ui.pairFailDisconnectButton, disconnect);
    Display.registerTouch(ui.pairUserCancelledDisconnectButton, disconnect);
    Display.registerTouch(ui.pairExistsDisconnectButton, disconnect);
    Display.registerTouch(ui.parseErrorDisconnectButton, disconnect);
    Display.registerTouch(ui.txErrorDisconnectButton, disconnect);
    Display.registerTouch(ui.bitcoinUriClearButton, waiting);
    Display.registerTouch(ui.optionScanButton, startScan);
    Display.registerTouch(ui.blink1Button, blinkPress1);
    Display.registerTouch(ui.blink2Button, blinkPress2);
    Display.registerTouch(ui.blink3Button, blinkPress3);
    Display.registerTouch(ui.blink4Button, blinkPress4);


    if (device.platform == 'iOS') {
        // Apple requirement
        console.log('Disabling check update button for iOS device.');
        ui.optionCheckUpdateButton.style.display = "none";
    }


    if (navigator && navigator.splashscreen)
        navigator.splashscreen.hide();
    Display.fade(ui.splashScreen);

    loadLocalData();

    ui.connectCheck.innerHTML = connectCheckingText;
    setTimeout(startUp, 2000);
}

function startUp() {
    let query = window.location.search;
    if (typeof query != 'undefined') {
        let serverParamPos = query.indexOf("&server=");
        let payload = '';
        let server = '';
        if (serverParamPos == -1) {
            payload = decodeURIComponent(query.substring('?data='.length));
        } else {
            payload = decodeURIComponent(query.substring('?data='.length, serverParamPos));
            server = decodeURIComponent(query.substring(serverParamPos + '&server='.length));
        }
        console.log("Received server: " + server);
        localData.serverURL = server;
        comserver_url = (server == '') ? DEFAULT_SERVER_URL : server;
        writeLocalData();
        console.log("Received payload: " + payload);
        parseData(payload);
    } else {
        comserver_url = (localData.serverURL == '') ? DEFAULT_SERVER_URL : localData.serverURL;
    }
    ui.serverUrlText.value = comserver_url;

    if (localData.channelID === "" || localData.channelID === undefined) {
        console.log('State - no server id.');
        disableConnectOptionsButtons(true);
        Display.displayDialog(dialog.connectPc, dialog);
    } else if (localData.bitboxEncryptionKey === "" || localData.bitboxEncryptionKey === undefined) {
        pairChallengeFinished = false;
        console.log('State - not paired.');
        Display.displayDialog(dialog.pairDbb, dialog);
    } else {
        waiting();
        serverPoll();
    }

    checkUpdatePost(false);
}


// ----------------------------------------------------------------------------
// Network status (debugging)
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
// Server communication
//

function serverPoll() {

    if (server_poll_pause) {
        setTimeout(serverPoll, 2000);
        return;
    }

    if (navigator.connection.type === Connection.NONE) {
        if (!verification_in_progress)
            Display.displayDialog(dialog.connectCheck, dialog);
        ui.connectCheck.innerHTML = connectNoInternetText;
        setTimeout(serverPoll, 500);
        return;
    } else {
        if (ui.connectCheck.innerHTML == connectNoInternetText)
            Display.displayDialog(dialog.waiting, dialog);
        ui.connectCheck.innerHTML = connectCheckingText;
    }

    if (localData.channelID === "" || localData.channelID === undefined) {
        console.log('Poll - no server id.');
        Display.displayDialog(dialog.connectPc, dialog);
        setTimeout(serverPoll, 2000);
        return;
    }

    try {
        var req = new XMLHttpRequest();
        req.open("GET", comserver_url + '?c=gd&uuid=' + localData.channelID + '&dt=1', true);
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                if (req.status == 200) {
                    var ret = JSON.parse(req.responseText);
                    //console.log('Recv:', ret.data, localData.channelID);
                    if (ret.data) {
                        var payload = ret.data[0].payload;
                        try {
                            payload = checkHMAC(payload, localData.authenticationKey);
                            payload = aes_cbc_b64_decrypt(payload, localData.encryptionKey);
                            console.log('Data', ret.data[0].id, ":", payload);
                            parseData(payload);
                        } catch(err) {
                            console.log(err);
                        }
                    }
                    serverPoll();
                } else {
                    console.log('Could not connect to communication server', comserver_url);
                    Display.displayDialog(dialog.serverError, dialog);
                    setTimeout(serverPoll, 2000);
                }
            }
        }
        req.send();
    }
    catch(err) {
        console.log('Could not connect to communication server', comserver_url);
        console.log(err.message);
        Display.displayDialog(dialog.serverError, dialog);
        setTimeout(serverPoll, 2000);
    }
}

function serverSendEncrypt(message) {
    const encryptedMessage = aes_cbc_b64_encrypt(message, localData.encryptionKey);
    const authenticatedMessage = appendHMAC(encryptedMessage, localData.authenticationKey);
    serverSend(authenticatedMessage);
}

function serverSend(payload) {
    var rn = Math.floor((Math.random() * 100000) + 1);
    var postContent = '&c=data&uuid=' + localData.channelID + '&pl=' + payload + '&dt=1';
    var req = new XMLHttpRequest();
    req.open("POST", comserver_url + '?rn=' + rn, true);
    req.setRequestHeader('Content-type','application/text; charset=utf-8');
    req.send(postContent);
}

function checkUpdatePost(display) {
    Update.checkUpdatePost(function(reply) {
        update_server.reply = reply;
        ui.checkUpdateText.innerHTML = reply.message;
        ui.checkUpdateUrlFollowButton.style.display = ((reply.url == '') ? 'none' : 'inline-block');
        hideOptionButtons();
        if (display) {
            server_poll_pause = true;
            Display.displayDialog(dialog.checkUpdate, dialog);
        }
    }, function () {
        Display.displayDialog(dialog.serverError, dialog);
    });
}


// ----------------------------------------------------------------------------
// General UI
//

function startScan()
{
    hideOptionButtons();
    try {
    cordova.plugins.barcodeScanner.scan(
               function (result) {
            parseData(result.text);
        },
               function (error) {
                       console.log("Scanning failed: " + error);
               },
        {
          "prompt" : "",
          "formats" : "QR_CODE"
        }
       );
    }
    catch(err) {
        console.log(err.message);
    }
}

function showOptionButtons() {
    ui.optionsSlider.style.top = "0%";
}

function hideOptionButtons() {
    ui.optionsSlider.style.top = "-100%";
}

function toggleOptions() {
    if (ui.optionsSlider.style.top == "-100%")
        showOptionButtons();
    else
        hideOptionButtons();
}

function randomNumberClear()
{
    serverSendEncrypt('{"random":"clear"}');
    waiting();
}

function disableConnectOptionsButtons(disable)
{
    connect_option_buttons_disabled = disable;
    ui.optionDisconnectButton.style.color = disable ? '#888' : '#000';
}

function resetState() {
    localData.channelID = '';
    localData.encryptionKey = '';
    localData.authenticationKey = '';
    ui.pairChallengeProgress.value = 0;
    resetSharedSecret();
}

function disconnect() {
    if (connect_option_buttons_disabled)
        return;

    if (!pairChallengeFinished) {
        serverSendEncrypt('{"ecdh":"abort"}');
    }
    // TODO: desktop app currently doesn't handle this event
    // serverSendEncrypt('{"action":"disconnect"}');
    hideOptionButtons();
    disableConnectOptionsButtons(true);
    resetState();
    
    console.log('disconnected and deleted bitboxEncryptionKey');
    // TODO: instead of erasing the legacy data immeditately, 
    // show an option to go back to the legacy pairing
    writeLocalData(startUp);
}

function waiting() {
    server_poll_pause = false;
    verification_in_progress = false;
    Display.displayDialog(dialog.waiting, dialog);
}

function serverUrl() {
    server_poll_pause = true;
    hideOptionButtons();
    Display.displayDialog(dialog.serverUrl, dialog);
}

function serverUrlSubmit() {
    server_poll_pause = false;
    localData.serverURL = (ui.serverUrlText.value == DEFAULT_SERVER_URL) ? '' : ui.serverUrlText.value;
    comserver_url = (localData.serverURL == '') ? DEFAULT_SERVER_URL : localData.serverURL;
    writeLocalData();

    if (localData.channelID === '')
        Display.displayDialog(dialog.connectPc, dialog);
    else if (localData.bitboxEncryptionKey === '')
        Display.displayDialog(dialog.pairDbb, dialog);
    else
        waiting();

    console.log('Setting server URL:', comserver_url);
}

function serverUrlRestoreDefault() {
    ui.serverUrlText.value = DEFAULT_SERVER_URL;
    serverUrlSubmit();
}

function serverUrlCancel() {
    server_poll_pause = false;

    if (localData.channelID === '')
        Display.displayDialog(dialog.connectPc, dialog)
    else if (localData.bitboxEncryptionKey === '')
        Display.displayDialog(dialog.pairDbb, dialog);
    else
        waiting();
}

// ----------------------------------------------------------------------------
// ECDH pairing UI
//

function resetSharedSecret() {
    localData.bitboxAuthenticationKey = '';
    localData.bitboxEncryptionKey = '';
    localData.bitpos = 0;
    localData.bytepos = 0;
}

function resetSharedSecretAndPersist() {
    resetSharedSecret();
    writeLocalData();
}

function blinkPress1() { blinkPress(1); }
function blinkPress2() { blinkPress(2); }
function blinkPress3() { blinkPress(3); }
function blinkPress4() { blinkPress(4); }
function blinkPress(p) {
    ui.blinkButtons.classList.add('disabled');
    let ecdh_challenge = Crypto.createHash('sha256').
        update(Buffer.from(localData.bitboxEncryptionKey + localData.bitboxAuthenticationKey, 'hex')).digest();
    let two_bit = (ecdh_challenge[localData.bytepos] >> (8 - 2 * localData.bitpos)) & 3;
    if ((two_bit + 1) != p) {
        resetSharedSecretAndPersist();
        serverSendEncrypt('{"ecdh":"abort"}');
        Display.displayDialog(dialog.pairFail, dialog);
        return;
    }
    if (localData.bytepos == 3) {
        ui.pairChallengeFinishButton.disabled = false;
        ui.pairChallengeFinishButton.style.color = '#000';
        ui.pairChallengeFinishButton.style.backgroundColor = '#fff';
    } else {
        ui.pairChallengeProgress.classList.remove('hidden');
    }
    ui.pairChallengeProgress.value += 1;
    if (ui.pairChallengeProgress.value > 12) {
        ui.pairChallengeProgress.style.display = 'none';
        ui.pairChallengeContinueNote.style.display = 'block';
    }
}

function pairBegin() {
    resetSharedSecretAndPersist();
    // ui.pairChallengeNextButton.classList.add('hidden');
    // ui.pairChallengeReadyButton.classList.remove('hidden');
    ecdh.generateKeys();
    let hash_pubkey = Crypto.createHash('sha256').update(ecdh.getPublicKey(null, 'compressed')).digest('hex');
    serverSendEncrypt('{"hash_ecdh_pubkey":"' + hash_pubkey + '"}');
    serverPoll();
}

function pairChallengeNext() {

    // ui.pairChallengeReadyButton.classList.add('hidden');
    // ui.pairChallengeNextButton.classList.remove('hidden');
    ui.blinkButtons.classList.remove('disabled');
    serverSendEncrypt('{"ecdh":"challenge"}');

    // advance the bit position if we're not at the initial position
    localData.bitpos = (localData.bitpos + 1) % 5;
    if (localData.bitpos == 0) {
      localData.bytepos = (localData.bytepos + 1) % 32;
      localData.bitpos = 1;
      if (localData.bytePos == 0) {
        ui.pairChallengeNextButton.disabled = true;
      }
    }
}

function pairChallengeAbort() {
    resetSharedSecretAndPersist();
    // This might not reach the Bitbox, but that's ok as long as the app does not hold the verification key.
    serverSendEncrypt('{"ecdh":"abort"}');
    Display.displayDialog(dialog.pairSuspicious, dialog);
}

function pairChallengeCancel() {
    resetSharedSecretAndPersist();
    // This might not reach the Bitbox, but that's ok as long as the app does not hold the verification key.
    serverSendEncrypt('{"ecdh":"abort"}');
    Display.displayDialog(dialog.pairUserCancelled, dialog);
}

function pairChallengeFinish() {
    if (ui.pairChallengeFinishButton.disabled) {
        return;
    }
    serverSendEncrypt('{"ecdh":"finish"}');
    Display.displayDialog(dialog.pairSuccess, dialog);
    pairChallengeFinished = true;
}

/*
var Base58Check = require('bs58check');
function pairManual() {
    Display.displayDialog(null, dialog);

    var pubkey = ecdhPubkey();
        pubkey = Base58Check.encode(new Buffer(pubkey.toString('hex'), 'hex'));

    ui.pairManualText.innerHTML =
                'Enter this in the PC app:<br><br>' +
                '<span style="color: ' + DBB_COLOR_WARN + ';">' +
                pubkey.slice(0, pubkey.length / 2) + '<br>' +
                pubkey.slice(pubkey.length / 2) + '</span>' +
                '<br><br><br>Then begin, and your Digital Bitbox will blink.<br><pre>' +
                '- Count the number of blinks in each set.\n' +
                '- Enter those numbers here.\n' +
                '- Stop anytime by tapping the Digital Bitbox\'s touch button.</pre>';

    serverSendEncrypt('{"ecdh":"manual"}');
}
*/


// ----------------------------------------------------------------------------
// Local storage
//

function loadLocalData() {
	try {
        // debug in browser:
        // localData = {"channelID":"C26UoG8xA6f3YCXYxAQWFGim839XZSEYWA2qTm5rSoqJ","encryptionKey":"G5NOcIpbE5h8lyfhyP9i80ETX5ipGiOua4rM7V0Jzcc=","serverURL":"","bitboxEncryptionKey":"ac248c9305b72adcffe024f2b4d7e724bb9ab2ef8f84be926623e3450df6b43d","authenticationKey":"oJ+nFl22CHZq5DHWHAVKCC8Z5d0XdQSBKYfKbLDlK58=","bitpos":2,"bytepos":4,"hash_pubkey_bitbox":"dd4942a4cd396c72a4c4d63f2e41033564e16f5298a87d5e08daa48cc40e2db8"};
        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function(dir) {
            dir.getFile("data.txt", {create:true}, function(file) {
			    localDataFile = file;
		        readLocalData();
            })
	    })
    }
    catch(err) {
        console.log(err.message);
    }
}

function readLocalData() {
    try {
        localDataFile.file(function(file) {
            var reader = new FileReader();
            reader.onloadend = function(e) {
                if (e.target.result) {
                    localData = JSON.parse(e.target.result);
                } else {
                    console.log('no file data to read');
                }
            }
            reader.readAsText(file);
        })
    }
    catch(err) {
        console.log(err.message);
    }
}

function writeLocalData(callback) {
	try {
        // console.log("localdata:", localData);
        if (!localDataFile) return;
        localDataFile.createWriter(function(fileWriter) {
            fileWriter.onwriteend = function(e) {
                if (typeof callback != 'undefined') {
                    callback();
                }
            };
            var blob = new Blob([JSON.stringify(localData)], {type:"text/plain"});
            fileWriter.write(blob);
        })
    }
    catch(err) {
        console.log(err.message);
    }
}

// ----------------------------------------------------------------------------
// Transaction UI
//

function sendDetails()
{
    ui.sendDetails.innerHTML = "<pre>" + tx_details + "</pre>";

    if (ui.sendDetails.style.display === "none")
        ui.sendDetails.style.display = "block";
    else
        ui.sendDetails.style.display = "none";
}

function sendLockPin()
{
    serverSendEncrypt('{"pin":"' + tx_lock_pin + '"}');
    waiting();
}

function sendLockCancel()
{
    serverSendEncrypt('{"pin":"abort"}');
    waiting();
}


// ----------------------------------------------------------------------------
// Crypto
//

function aes_cbc_b64_decrypt(ciphertext, keyInHex) {
    var result;
    try {
        var ub64 = new Buffer(ciphertext, "base64").toString("binary");
        var iv   = new Buffer(ub64.slice(0, 16), "binary");
        var enc  = new Buffer(ub64.slice(16), "binary");
        var key  = new Buffer(keyInHex, "hex");
        var decipher = Crypto.createDecipheriv("aes-256-cbc", key, iv);
        var dec = decipher.update(enc) + decipher.final();
        result = dec.toString("utf8");
    } catch(err) {
        console.log(err);
        result = ciphertext;
    }
    return result;
}

function aes_cbc_b64_encrypt(plaintext, keyInHex) {
    try {
        var iv = Crypto.pseudoRandomBytes(16);
        var key = new Buffer(keyInHex, "hex");
        var cipher = Crypto.createCipheriv("aes-256-cbc", key, iv);
        var ciphertext = Buffer.concat([iv, cipher.update(plaintext), cipher.final()]);
        return ciphertext.toString("base64");
    } catch(err) {
        console.log(err);
    }
}

function appendHMAC(ciphertext, authenticationKey) {
    const buffer = new Buffer(ciphertext, "base64");
    const key = new Buffer(authenticationKey, "hex");
    const hmac = Crypto.createHmac("sha256", key).update(buffer).digest();
    return Buffer.concat([buffer, hmac]).toString("base64");
}

function checkHMAC(ciphertextWithMAC, authenticationKey) {
    const buffer = new Buffer(ciphertextWithMAC, "base64");
    const ciphertext = buffer.slice(0, buffer.length - 32);
    const hmac = buffer.slice(buffer.length - 32, buffer.length);
    const key = new Buffer(authenticationKey, "hex");
    if (Crypto.createHmac("sha256", key).update(ciphertext).digest("hex") != hmac.toString("hex")) {
        throw "The appended HMAC is wrong.";
    }
    return ciphertext.toString("base64")
}

function getInputs(coin, inputAndChangeType, transaction, sign) {
    console.log("getInputs", coin, inputAndChangeType);
    var addresses = [];
    var tx = [];
    pair.prevOutputs = new Array(transaction.inputs.length);
    pair.blockExplorerError = false;
    try {
        var responseCount = 0;
        for (var inputIndex = 0; inputIndex < transaction.inputs.length; inputIndex++) {
            var input = transaction.inputs[inputIndex].toObject();

            var reply = false,
                blockexplorer_fail_limit,
                blockexplorer_count = 0;
            var onMessage = function(e) {
                if (reply) {
                    console.log("ignoring second reply for input ", inputIndex);
                    return;
                }
                if (e.data === null) {
                    blockexplorer_count++;
                    if (blockexplorer_count >= blockexplorer_fail_limit) {
                        console.log('Error: could not get address balances.');
                        responseCount++;
                        pair.blockExplorerError = true;
                    }
                } else {
                    reply = true;
                    responseCount++;
                    var txData = new Bitcore.Transaction(JSON.parse(e.data.response).rawtx);
                    var inputIndex = e.data.meta;
                    var input = transaction.inputs[inputIndex].toObject();
                    pair.prevOutputs[inputIndex] = txData.outputs[input.outputIndex].toObject();
                }
                if (responseCount >= transaction.inputs.length) {
                    process_verify_transaction(coin, inputAndChangeType, transaction, sign);
                }

            };
            var postMessage = function(get) {
                var req = new XMLHttpRequest();
                req.open("GET", get.url, false);
                req.send(null);
                if (req.status == 200)
                    onMessage({ 'data': { 'response': req.responseText, 'meta': get.meta } });
                else
                    onMessage(null);
            };
            switch(coin) {
            case "btc":
                blockexplorer_fail_limit = 2;
                postMessage({ url: "https://blockexplorer.com/api/rawtx/" + input.prevTxId, meta: inputIndex });
                postMessage({ url: "https://insight.bitpay.com/api/rawtx/" + input.prevTxId, meta: inputIndex });
                break;
            case "tbtc":
                blockexplorer_fail_limit = 1;
                postMessage({ url: "https://testnet.blockexplorer.com/api/rawtx/" + input.prevTxId, meta: inputIndex });
                break;
            case "ltc":
                blockexplorer_fail_limit = 1;
                postMessage({ url: "https://insight.litecore.io/api/rawtx/" + input.prevTxId, meta: inputIndex });
                break;
            case "tltc":
                blockexplorer_fail_limit = 1;
                postMessage({ url: "https://testnet.insight.litecore.io/api/rawtx/" + input.prevTxId, meta: inputIndex });
                break;
            }
        }
    }
    catch(err) {
        console.log('Could not get inputs. Unknown error.', err);
        process_verify_transaction(coin, inputAndChangeType, transaction, sign);
    }
}


// ----------------------------------------------------------------------------
// Parse input / verification
//

function process_verify_transaction(coin, inputAndChangeType, transaction, sign)
{
    console.log("verify tx for coin and type ", coin, inputAndChangeType);
    var total_in = 0,
        total_out = 0,
        external_address = '',
        external_amount = 0,
        err = '',
        res = '',
        a_elements = [];

    tx_details = '';

    // Get outputs and amounts
    tx_details += "\nOutputs:\n";

    var keyring = [];
    if (sign.checkpub) {
        for (var j = 0; j < sign.checkpub.length; j++)
            keyring.push(sign.checkpub[j].pubkey);
    }

    for (var i = 0; i < transaction.outputs.length; i++) {
        var address, amount, present;
        if (transaction.outputs[i].script.isWitnessPublicKeyHashOut()) {
            var publicKeyHash = transaction.outputs[i].script.toBuffer().slice(2);
            address = parseP2WPKH(publicKeyHash, bech32Prefix[coin]);
        } else {
            address = transaction.outputs[i].script
                .toAddress(coinNet[coin]).toString();
        }

        amount = transaction.outputs[i].satoshis;
        total_out += amount;

        // Check if the output address is a change address
        present = false;
        for (var j = 0; j < (sign.checkpub ? sign.checkpub.length : 0); j++) {
            var checkaddress;
            var pubk = sign.checkpub[j].pubkey;

            // p2pkh
            checkaddress = pubKeyToAddress(new Bitcore.PublicKey(pubk), coin + "-" + inputAndChangeType);
            console.log(checkaddress, address);
            if (checkaddress === address)
                present = sign.checkpub[j].present;

            // multisig, any m of n
            for (var m = 0; m < keyring.length + 1; m++) {
                checkaddress = new Bitcore.Address(keyring, m).toString();

                if (checkaddress === address)
                    present = sign.checkpub[j].present;
            }
        }

        if (!present || transaction.outputs.length == 1) {
            res = address + "  " + Bitcore.Unit.fromSatoshis(amount).toBTC() + " " + coin.toUpperCase() + "\n";
            tx_details += '<span style="color: ' + DBB_COLOR_WARN + ';">' + res + '</span>';
            external_address = address;
            external_amount = Bitcore.Unit.fromSatoshis(amount).toBTC() + " " + coin.toUpperCase();
        } else {
            res = address + "  " + Bitcore.Unit.fromSatoshis(amount).toBTC() + " " + coin.toUpperCase() + " (change address)\n";
            tx_details += '<span style="color: ' + DBB_COLOR_SAFE + ';">' + res + '</span>';
        }
    }

    if (typeof sign.pin == "string") {
        ui.sendUnlockedMode.style.display = "none";
        ui.sendLockedMode.style.display = "block";
        tx_lock_pin = sign.pin;
    } else {
        ui.sendUnlockedMode.style.display = "block";
        ui.sendLockedMode.style.display = "none";
        tx_lock_pin = '';
    }


    // Display short result
    ui.sendDetails.style.display = "none";
    ui.sendAddress.innerHTML = external_address;
    ui.sendAmount.innerHTML = external_amount;
    Display.displayDialog(dialog.send, dialog);


    if (!pair.blockExplorerError) {
        // Get input addresses and balances
        tx_details += "\nInputs:\n";
        for (var i = 0; i < pair.prevOutputs.length; i++) {
            address = transaction.inputs[i].toObject().prevTxId + ':' + i.toString();
            var balance = pair.prevOutputs[i].satoshis;
            res = address + "  " + Bitcore.Unit.fromSatoshis(balance).toBTC() + " " + coin.toUpperCase() + "\n";
            tx_details += '<span style="color: ' + DBB_COLOR_SAFE + ';">' + res + '</span>';
            total_in += balance;
        }
        // Calculate fee (inputs - outputs)
        res = "Fee:\n" + Bitcore.Unit.fromSatoshis(total_in - total_out).toBTC() + " " + coin.toUpperCase() + "\n";
        if ((total_in - total_out) > WARNFEE) {
            tx_details = '<span style="color: ' + DBB_COLOR_DANGER + ';">' + res + '</span>' + tx_details;
        } else {
            tx_details = '<span style="color: ' + DBB_COLOR_BLACK + ';">' + res + '</span>' + tx_details;
        }
    } else {
        tx_details = 'Fee:<span style="color: ' + DBB_COLOR_DANGER + ';">' +
            '\nDid not receive all input amounts from the blockchain explorers. ' +
            'The fee is equal to the total input amounts minus the total output amounts.\n' +
            'Check your internet settings and try again.\n</span>' + tx_details;

        err += '<br>WARNING: Could not calculate the fee.<br>';
    }

    // Verify that input hashes match meta utx
    tx_details += "\nHashes to sign:\n";
    var errset = false;
    for (var j = 0; j < sign.data.length; j++) {
        var present = false;
        for (var i = 0; !pair.blockExplorerError && i < transaction.inputs.length; i++) {
            var nhashtype,
                sighash;

            nhashtype = Bitcore.crypto.Signature.SIGHASH_ALL;
            // script is not the sigScript, but the subScript used in signing (unsigned tx serialization format).
            var subScript = transaction.inputs[i].script.toBuffer();

            // p2pkh
            switch (inputAndChangeType) {
            case "p2pkh":
                sighash = Bitcore.Transaction
                    .sighash
                    .sighash(transaction, nhashtype, i,  subScript);
                sighash = new Reverse(sighash);
                break;
            case "p2wpkh-p2sh":
            case "p2wpkh":
                // subScript is a p2wpkh pkScript in either case.
                var pubKeyHash = subScript.slice(2);
                // 0x19 OP_DUP OP_HASH160 OP_DATA_20 <20 byte pubkeyhash> OP_EQUALVERIFY OP_CHECKSIG
                var scriptCode = Buffer.concat(
                    [new Buffer([0x19, 0x76, 0xa9, 0x14]),
                     pubKeyHash, new Buffer([0x88, 0xac])
                    ]);
                var satoshis = pair.prevOutputs[i].satoshis;
                var satoshisBuffer = new Bitcore.encoding.BufferWriter().writeUInt64LEBN(new Bitcore.crypto.BN(satoshis)).toBuffer();
                sighash = Bitcore.Transaction
                    .SighashWitness
                    .sighash(transaction, nhashtype, i, scriptCode, satoshisBuffer);
                break;
            }

            if (sign.data[j].hash === sighash.toString('hex'))
                present = true;
        }

        if (present === false) {
            if (errset === false) {
                errset = true;
                err += '<br>WARNING: Unknown data being signed!<br>';
            }
            res = "Unknown: " + sign.data[j].hash;
            tx_details += '<span style="color: ' + DBB_COLOR_DANGER + ';">' + res + '<br></span>';
        } else {
            res = sign.data[j].hash;
            tx_details += '<span style="color: ' + DBB_COLOR_SAFE + ';">' + res + '<br></span>';
        }
    }


    // Extra information
    console.log("2FA message received:\n" + JSON.stringify(sign, undefined, 4));

    if (err != '')
        ui.sendError.innerHTML = '<span style="color: ' + DBB_COLOR_DANGER + ';">' + err + '</span>';
    else
        ui.sendError.innerHTML = '';
}


function process_dbb_pairing(parse)
{
    var hash_pubkey_bitbox = parse.ecdh.hash_pubkey;
    if (typeof hash_pubkey_bitbox == "string") {
        localData.hash_pubkey_bitbox = hash_pubkey_bitbox;
        var pubkeyHex = ecdh.getPublicKey('hex', 'compressed');
        serverSendEncrypt('{"ecdh_pubkey":"' + pubkeyHex + '"}');
        return;
    }

    var pubkey_bitbox = parse.ecdh.pubkey;
    if (typeof pubkey_bitbox == "string") {
        var calculatedHash = Crypto.createHash('sha256').update(new Buffer(pubkey_bitbox, 'hex')).digest('hex');
        if (localData.hash_pubkey_bitbox == calculatedHash) {
            let shared_secret = ecdh.computeSecret(pubkey_bitbox, 'hex');
            shared_secret = Crypto.createHash('sha256').update(shared_secret).digest();
            shared_secret = Crypto.createHash('sha256').update(shared_secret).digest();
            shared_secret = Crypto.createHash('sha512').update(shared_secret).digest();

            localData.bitboxEncryptionKey = shared_secret.slice(0, shared_secret.length / 2).toString('hex')
            localData.bitboxAuthenticationKey = shared_secret.slice(shared_secret.length / 2, shared_secret.length).toString('hex')
            writeLocalData();
            Display.displayDialog(dialog.pairChallenge, dialog);
        } else {
            console.log('Pairing failed because hash of bitbox public key does not match.');
            localData.bitboxEncryptionKey = ''
            localData.bitboxAuthenticationKey = ''
            writeLocalData();
            Display.displayDialog(dialog.pairFail, dialog);
        }
    }
}


function parseP2WPKH(publicKeyHash, prefix) {
    var witnessVersion = 0;
    var program = [witnessVersion].concat(bech32.toWords(publicKeyHash));
    return bech32.encode(prefix, program);
};

function parseP2PKH(publicKey, network) {
    return new Bitcore.Address.fromPublicKey(publicKey, network).toString();
};

function parseP2WPKHP2SH(publicKeyHash, network) {
    var redeemScript = new Bitcore.Script();
    redeemScript.add(Bitcore.Opcode.OP_0);
    redeemScript.add(publicKeyHash);
    return new Bitcore.Address.payingTo(redeemScript, network).toString();
};

function pubKeyToAddress(publicKey, type) {
    var publicKeyHash = Bitcore.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
    switch (type) {
    case 'p2pkh': // for backwards compat
    case 'btc-p2pkh':
        return parseP2PKH(publicKey, 'mainnet');
    case 'btc-p2wpkh-p2sh':
        return parseP2WPKHP2SH(publicKeyHash, 'mainnet');
    case 'btc-p2wpkh':
        return parseP2WPKH(publicKeyHash, "bc");
    case 'tbtc-p2pkh':
        return parseP2PKH(publicKey, 'testnet');
    case 'tbtc-p2wpkh-p2sh':
        return parseP2WPKHP2SH(publicKeyHash, 'testnet');
    case 'tbtc-p2wpkh':
        return parseP2WPKH(publicKeyHash, "tb");
    case 'ltc-p2pkh':
        return parseP2PKH(publicKey, 'ltc-mainnet');
    case 'ltc-p2wpkh-p2sh':
        return parseP2WPKHP2SH(publicKeyHash, 'ltc-mainnet');
    case 'ltc-p2wpkh':
        return parseP2WPKH(publicKeyHash, "ltc");
    case 'tltc-p2pkh':
        return parseP2PKH(publicKey, 'ltc-testnet');
    case 'tltc-p2wpkh-p2sh':
        return parseP2WPKHP2SH(publicKeyHash, 'ltc-testnet');
    case 'tltc-p2wpkh':
        return parseP2WPKH(publicKeyHash, "tltc");
    }
}

function process_verify_address(plaintext, type)
{
    console.log("verify address of type ", type);
    var parse = '';
    var publicKey = new Bitcore.HDPublicKey(plaintext).publicKey;
    var parse = pubKeyToAddress(publicKey, type);
    if (parse)
        parse = "<pre>" + parse + "</pre>";
    else
        parse = 'Error: Coin network not defined.';

    ui.receiveAddress.innerHTML = parse;
    Display.displayDialog(dialog.receive, dialog);
}


function parseData(data)
{
    try {

        if (data == '') {
            server_poll_pause = false;
            pair.QRtext = [];
            return;
        }

        // QR sequence reader
        if (data.slice(0,2).localeCompare('QS') == 0) {
            var text = '';
            var inprogress = false;
            var seqNumber = data[2]; // {0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ}
            var seqTotal = data[3];

            server_poll_pause = true;

            if (isNaN(seqNumber)) {
                seqNumber = seqNumber.toUpperCase().charCodeAt(0);
                seqNumber = seqNumber - "A".charCodeAt(0) + 10;
            }

            if (isNaN(seqTotal)) {
                seqTotal = seqTotal.toUpperCase().charCodeAt(0);
                seqTotal = seqTotal - "A".charCodeAt(0) + 10;
            }

            pair.QRtext[seqNumber] = data.substring(4);

            for (var i = 0; i < seqTotal; i++) {
                if (pair.QRtext[i] === undefined) {
                    inprogress = true;
                    text += ' _ ';
                } else {
                    if (i == seqNumber)
                        text += '<span style="color:' + DBB_COLOR_WARN + '">&#9724;</span>';
                    else
                        text += '<span style="color:' + DBB_COLOR_BLACK + '">&#9724;</span>';
                }
            }

            if (inprogress) {
                ui.qrSequenceText.innerHTML = 'continue scanning<br>' + text;
                Display.displayDialog(dialog.qrSequence, dialog);
                setTimeout(startScan, 1500); // ms
                return;
            }

            data = pair.QRtext.join('');
            pair.QRtext = [];
        }


        if (data.slice(0,8).localeCompare('bitcoin:') == 0) {
            var address = '',
                params,
                amount;

            verification_in_progress = true;

            if (data.indexOf('?') > -1) {
                address = data.slice(8).split('?')[0];
                params = data.split('?')[1].split('&').map(function(i) { return i.split('=');}).reduce(function(m,o){ m[o[0]] = o[1]; return m;},{});
                amount = params.amount;
            } else {
                address = data.slice(8);
            }

            ui.bitcoinUriAddress.innerHTML = address;

            if (amount)
                ui.bitcoinUriAmount.innerHTML = '<big>' + amount + ' ' + coin.toUpperCase() + '</big><br><br><i class="fa fa-long-arrow-down fa-lg"></i><br><br>'
            else
                ui.bitcoinUriAmount.innerHTML = '';

            Display.displayDialog(dialog.bitcoinUri, dialog);
            return;
        }


        data = JSON.parse(data);


        // Tests if already paired to Digital Bitbox
        if (typeof data.tfa == "string") {
            console.log('tfa value', data.tfa);
            data.tfa = checkHMAC(data.tfa, localData.bitboxAuthenticationKey);
            if (aes_cbc_b64_decrypt(data.tfa, localData.bitboxEncryptionKey) === VERIFYPASS_CRYPT_TEST) {
                console.log("Successfully paired.");
                Display.displayDialog(dialog.pairSuccess, dialog);
            } else {
                console.log("Pairing failed!");
                Display.displayDialog(dialog.pairFail, dialog);
            }
            return;
        }

        // Server requested action
        if (typeof data.action == "string") {
            console.log('server request:', data.action);

            if (data.action == "clear") {
                if (localData.bitboxEncryptionKey === '')
                    Display.displayDialog(dialog.pairDbb, dialog);
                else
                    waiting();
                return;
            }

            if (data.action == "ping") {
                serverSendEncrypt('{"action":"pong"}');
                return;
            }
        }

        // Sets up connection to desktop app
        if (typeof data.id == "string") {
            data.key = new Buffer(data.key, 'base64').toString('hex')
            data.mac = new Buffer(data.mac, 'base64').toString('hex')

            localData.channelID = data.id;
            localData.encryptionKey = data.key;
            localData.authenticationKey = data.mac;
            writeLocalData();

            if (localData.bitboxEncryptionKey === '')
                Display.displayDialog(dialog.pairDbb, dialog);
            else
                Display.displayDialog(dialog.pairExists, dialog);

            disableConnectOptionsButtons(false);
            serverSendEncrypt('{"id":"success"}');
            return;
        }


        // Finalizes ECDH pairing to Digital Bitbox
        if (typeof data.ecdh == "object") {
            // Silently drop if already paired
            if (localData.bitboxEncryptionKey === '')
                process_dbb_pairing(data);
            return;
        }


        if (typeof data.echo == "string") {
            // Echo verification of data
            var ciphertext = checkHMAC(data.echo, localData.bitboxAuthenticationKey);
            var plaintext = aes_cbc_b64_decrypt(ciphertext, localData.bitboxEncryptionKey);

            console.log("plaintext", plaintext);
            if (plaintext === ciphertext) {
                console.log('Could not parse: ' + JSON.stringify(plaintext, undefined, 4));
                Display.displayDialog(dialog.parseError, dialog);
                return;
            }

            // Verify receiving address
            if (plaintext.slice(0,4).localeCompare('xpub') == 0) {
                verification_in_progress = true;
                process_verify_address(plaintext, data.type);
                return;
            }

            // Verify random number
            if (typeof JSON.parse(plaintext).random == "string") {
                ui.randomNumber.innerHTML = JSON.parse(plaintext).random;
                Display.displayDialog(dialog.randomNumber, dialog);
                return;
            }

            // Verify transaction
            if (typeof JSON.parse(plaintext).sign == "object") {

                Display.displayDialog(dialog.connectCheck, dialog);
                ui.connectCheck.innerHTML = 'Processing...';

                var transaction;
                var coin;
                var sign = JSON.parse(plaintext).sign;

                if (typeof data.tx == "string") {
                    var hash;
                    hash = Crypto.createHash('sha256')
                                 .update(new Buffer(data.tx, 'ascii'))
                                 .digest();
                    hash = Crypto.createHash('sha256')
                                 .update(new Buffer(hash, 'hex'))
                                 .digest()
                                 .toString('hex');

                    if (hash !== sign.meta) {
                        console.log('Error: mismatched verification data.');
                        Display.displayDialog(dialog.txError, dialog);
                        return;
                    }

                    transaction = new Bitcore.Transaction(data.tx);
                } else {
                    transaction = new Bitcore.Transaction(sign.meta);
                }

                if (typeof JSON.parse(plaintext).pin == "string")
                    sign.pin = JSON.parse(plaintext).pin;

                if (typeof data.coin == "string") {
                    coin = data.coin;
                } else {
                    coin = "btc";
                }

                verification_in_progress = true;
                getInputs(coin,
                          typeof data.inputAndChangeType == "string" ? data.inputAndChangeType : "p2pkh",
                          transaction,
                          sign); // calls process_verify_transaction() after getting input values
                return;
            }

            console.log('No operation for: ' + JSON.stringify(data, undefined, 4));
            Display.displayDialog(dialog.parseError, dialog);
            return;
        }

        console.log('Unknown input: ' + JSON.stringify(data, undefined, 4));
        Display.displayDialog(dialog.parseError, dialog);

    }
    catch(err) {
        console.log(err, data);
        Display.displayDialog(dialog.parseError, dialog);
    }
}
