## Digital Bitbox QR app

**Work in progress. Not fully tested.**

This smartphone app is a general purpose and minimalistic barcode scanner, using the wildabeast BarcodeScanner plugin. 

For the Digital Bitbox, it is used to verify QR codes before signing a transaction. This avoids handcrafted man-in-the-middle attacks on compromised computers by verifying that you are signing the correct transaction. 

Just click the button to scan. Plaintext is printed without formatting. JSON-formatted text is pretty-printed. AES-256-CBC encrypted text is decrypted with a user-supplied password (hardcoded at the moment).


## Installation

From app stores at a later date.


## Installation from source

Requires:
  1. **Node.js** and **npm** from https://nodejs.org/
  2. **Cordova command line interface** installed using npm `sudo npm install -g cordova` (OSX and Linux).
  3. **Browserify** installed using npm `sudo npm install -g browserify`
  4. For Android devices: **Android SDK** from https://developer.android.com/sdk/index.html
  5. For iOS devices: **Xcode** from https://developer.apple.com/xcode/

Command line build and install:

```
git clone --recursive https://github.com/digitalbitbox/QR_app.git
cordova create digitalbitboxQR com.digitalbitbox.qr "Digital Bitbox QR" --copy-from=./QR_app/
cd digitalbitboxQR
cordova platform add android
cordova platform add ios
cordova plugins add https://github.com/wildabeast/BarcodeScanner
npm install bitcore
browserify www/js/main.js -o www/js/app.js
cordova build android
cordova build ios
```

To install on an Android phone, connect it to your computer and type  `cordova run android`. Developer permissions are explained here https://developer.android.com/tools/device.html. 

To install on an iPhone, open `platforms/ios/Digital Bitbox QR.xcodeproj` in Xcode, select your device from the dropdown menu, and push the `Run` button.



