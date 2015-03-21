/*
 
 The MIT License (MIT)

 Copyright (c) 2015 Douglas J. Bakkum

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

//
//  AES-256-CBC with base64 encoding
//  Uses node.js crypto core module
//

var crypto = require("crypto");

var aes = {};
 
aes.cbc_b64_decrypt = function(key, ciphertext)
{
    try {
        var ub64 = new Buffer(ciphertext, "base64").toString("binary");
        var iv   = new Buffer(ub64.slice(0, 16), "binary");
        var enc  = new Buffer(ub64.slice(16), "binary");
        var decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        var dec = decipher.update(enc) + decipher.final();
        return dec.toString("utf8");
    }
    catch(err) {
        return "Could not decrypt text:<br><br>" + ciphertext;
        //return err.message;
    }
}

aes.cbc_b64_encrypt = function(key, plaintext)
{
    try {
        var iv = crypto.pseudoRandomBytes(16);
        var cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
        var ciphertext = Buffer.concat([iv, cipher.update(plaintext), cipher.final()]);
        return ciphertext.toString("base64");
    }
    catch(err) {
        return err.message;
    }
}




//
//  Load key 
//            TODO user input password, hardcoded for now
//

var key = "0000";
key = crypto.createHash("sha256").update(key).digest();
key = crypto.createHash("sha256").update(key).digest();



//
//  Run
//

var resultDiv;

document.getElementById('clearButton').style.visibility = 'hidden';
document.addEventListener("deviceready", init, false);

function init()
{
	document.querySelector("#scanButton").addEventListener("click", startScan, false);
	document.querySelector("#clearButton").addEventListener("click", clearFunc, false);
	resultDiv = document.querySelector("#scanResults");
}


function startScan()
{
	cordova.plugins.barcodeScanner.scan(
		function (result)
        {
            resultDiv.innerHTML = aes.cbc_b64_decrypt(key, result.text);
            document.getElementById('scanResults').style.visibility = 'visible';
            document.getElementById('clearButton').style.visibility = 'visible';
        }, 
		function (error) {
			alert("Scanning failed: " + error);
		}
	);
}

function clearFunc() 
{
    resultDiv.innerHTML = "&nbsp;";
    document.getElementById('clearButton').style.visibility = 'hidden'; 
}
