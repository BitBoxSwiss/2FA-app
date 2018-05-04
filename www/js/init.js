// Wait for device API libraries to load
//
var Display = require("./display.js");
var Update = require("./update.js");
require("./global.js");

document.addEventListener("deviceready", init, false);

const oldHTML = "index_old.html";
const newHTML = "index_new.html";

const serverSettingsFile = "server_settings.txt";

var settings = {
    serverUrl : DEFAULT_SERVER_URL
}

var update_server = {
    reply: {message: '', url: '', version: ''}
};

var ui = {
    splashScreen: null,
    spinnerDialog: null,
    header: null,
    optionsSlider: null,
    optionScanButton: null,

    connectCheckDialog: null,
    connectCheck: null,
    connectPcDialog: null,
    optionsIcon: null,
    connectScanButton: null,

    optionCheckUpdateButton: null,
    checkUpdateDialog: null,
    checkUpdateText: null,
    checkUpdateUrlFollowButton: null,
    checkUpdateCloseButton: null,

    optionServerUrlChangeButton: null,
    serverUrlDialog: null,
    serverUrlText: null,
    serverUrlSubmitButton: null,
    serverUrlRestoreDefaultButton: null,
}

var dialogs = {}

document.addEventListener("backbutton", init, false);

function setupServerUrlUIcomponents() {
    ui.serverUrlText.value = settings.serverUrl;
    Display.registerTouch(ui.optionServerUrlChangeButton, showServerUrlDialog);
    Display.registerTouch(ui.serverUrlSubmitButton, serverUrlSubmit);
    Display.registerTouch(ui.serverUrlRestoreDefaultButton, serverUrlRestoreDefault);
}

// device APIs are available
//
function init() {
    // At the moment, we distinguish if we're in legacy mode based on the 
    // data structure. If a file localdata.txt exists and a field 'verification_key' 
    // is available, we're in legacy mode. If a file data.txt exists and a field 
    // 'authenticationKey' is available, we're in the
    // new mode. If none of the above is available, we wait until the user
    // scans the QR code and decide based on whether a mac field is transmitted
    // whether we are in legacy or new mode.
    loadData('data.txt', function(data) {
        if (typeof data != 'undefined' && 
                typeof data.authenticationKey != 'undefined' && 
                data.authenticationKey != '') {
            window.location.href = newHTML;
        } else {
            loadData('localdata.txt', function(legacydata) {
                if (typeof legacydata != 'undefined' && 
                        typeof legacydata.verification_key != 'undefined' && 
                        legacydata.verification_key != '') {
                    window.location.href = oldHTML;
                } else {
                    if (Object.keys(dialogs).length === 0) {

                        dialogs = Display.initDialogs(ui)

                        if (navigator && navigator.splashscreen)
                            navigator.splashscreen.hide();
                        Display.fade(ui.splashScreen);

                        if (device.platform == 'iOS') {
                            // Apple requirement
                            console.log('Disabling check update button for iOS device.');
                            ui.optionCheckUpdateButton.style.display = "none";
                        }

                        Display.registerTouch(ui.header, hideOptionButtons);
                        Display.registerTouch(ui.optionsIcon, toggleOptions);
                        Display.registerTouch(ui.connectScanButton, connectScan);

                        Display.registerTouch(ui.optionCheckUpdateButton, checkUpdate);
                        Display.registerTouch(ui.checkUpdateUrlFollowButton, function() {
                            Update.followUrl(update_server.reply.url, init)
                        });
                        Display.registerTouch(ui.checkUpdateCloseButton, init);

                        if (typeof legacydata != 'undefined' && typeof legacydata.server_url != 'undefined') {
                            settings.serverUrl = (legacydata.server_url == '') ? DEFAULT_SERVER_URL : legacydata.server_url;
                            setupServerUrlUIcomponents();
                        } else if (typeof data != 'undefined' && typeof data.serverURL != 'undefined') {
                            settings.serverUrl = (data.serverURL == '') ? DEFAULT_SERVER_URL : data.serverURL;
                            setupServerUrlUIcomponents();
                        } else {
                            loadData(serverSettingsFile, function (serverSettings) {
                                if (typeof serverSettings != 'undefined' &&
                                    typeof serverSettings.serverUrl != 'undefined' &&
                                    serverSettings.serverUrl != ''
                                ) {
                                    settings.serverUrl = serverSettings.serverUrl;
                                } else {
                                    settings.serverUrl = DEFAULT_SERVER_URL;
                                }
                                setupServerUrlUIcomponents();
                            });
                        }

                        Display.registerTouch(ui.optionScanButton, startScan);
                    }
                    Display.displayDialog(ui.connectPcDialog, dialogs);
                }
            });
        }
    });
}

// --------------------------------------------------------
// Stored data

function loadData(filename, callback) {
	try {
        if (device.platform == 'browser') {
            callback(undefined);
            // or initialize the data structure for legacy or new app and 
            // load with callback(legacyData);
        } else {
            window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function(dir) {
                dir.getFile(filename, {create:true}, function(file) {
                    readData(file, callback); 
                })
            })
        }
    }
    catch(err) {
        console.log(err.message);
    }
}

function readData(datafile, callback) {
    try {
        datafile.file(function(file) {
            var reader = new FileReader();
            reader.onloadend = function(e) {
                let parsedData = undefined;
                if (e.target.result) {
                    parsedData = JSON.parse(e.target.result);
                } else {
                    console.log('no file data to read');
                }
                callback(parsedData);
            }
            reader.readAsText(file);
        })
    }
    catch(err) {
        console.log(err.message);
    }
}

// Scanning

function connectScan()
{
    setTimeout(function(){
        Display.displayDialog(ui.connectCheck, dialogs);
        startScan();
    }, 300); // ms
}

function redirect(result) {
    let versionSpecificLocation = oldHTML;
    let data = JSON.parse(result.text);
    if (typeof data.mac != 'undefined') {
        versionSpecificLocation = newHTML;
    }
    window.location.assign(versionSpecificLocation + "?data=" +
        encodeURIComponent(result.text) +
        "&server=" + encodeURIComponent(settings.serverUrl));
}

function startScan()
{
    hideOptionButtons();

    if (device.platform == 'browser') {
        let resulttext = prompt("Please enter the QR code data", "");
        let result = {
            text : resulttext
        }
        redirect(result);
    } else {
        try {
            cordova.plugins.barcodeScanner.scan(
                redirect,
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
}

// Options

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

// Updates

function checkUpdate() {
    Update.checkUpdatePost(function(reply) {
        update_server.reply = reply;
        ui.checkUpdateText.innerHTML = reply.message;
        ui.checkUpdateUrlFollowButton.style.display = ((reply.url == '') ? 'none' : 'inline-block');
        hideOptionButtons();
        Display.displayDialog(dialogs.checkUpdate, dialogs);
    }, function() {
        // Display.displayDialog(dialogs.serverError, dialogs);
        // TODO: also move to index.html
    })
}

// Server settings

function writeServerSettings(serverSettings) {
	try {
        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function(dir) {
            dir.getFile(serverSettingsFile, {create:true}, function(file) {
                file.createWriter(function(fileWriter) {
                    var blob = new Blob([JSON.stringify(serverSettings)], {type:"text/plain"});
                    fileWriter.write(blob);
                });
            });
        });
    }
    catch(err) {
        console.log(err.message);
    }
}

function showServerUrlDialog() {
    hideOptionButtons();
    Display.displayDialog(dialogs.serverUrl, dialogs);
}

function serverUrlSubmit() {
    settings.serverUrl = ui.serverUrlText.value;
    writeServerSettings(settings);
    console.log('Setting server URL:', settings.serverUrl);
    init();
}

function serverUrlRestoreDefault() {
    ui.serverUrlText.value = DEFAULT_SERVER_URL;
    serverUrlSubmit();
}
