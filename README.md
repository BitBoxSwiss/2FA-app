## Digital Bitbox | Smart Verification & Two Factor Authentication mobile app


Use with the [Digital Bitbox](https://digitalbitbox.com) hardware wallet to provide the highest level of security.


## Installation

- [Android app](https://play.google.com/store/apps/details?id=com.digitalbitbox.tfa)
- [iOS app](https://itunes.apple.com/us/app/digital-bitbox-2fa/id1079896740)

## Installation from source

The source code is under development and may not be compatible with stable releases of the desktop app or MCU firmware.

Requires:
  1. [**Node.js** and **npm**](https://nodejs.org/)
  2. **Cordova command line interface** installed using npm `npm install -g cordova`
  3. For Android devices: [**Android SDK**](https://developer.android.com/sdk/)
  4. For iOS devices: [**Xcode**](https://developer.apple.com/xcode/)

Command line build and install:

```
git clone https://github.com/digitalbitbox/2FA-app.git 
cordova create digitalbitbox2FA com.digitalbitbox.tfa "DigitalBitbox2FA" --copy-from=./2FA-app/
cd digitalbitbox2FA
cordova platform add android 
cordova plugin add phonegap-plugin-barcodescanner
cordova plugin add cordova-plugin-whitelist
cordova plugin add cordova-plugin-inappbrowser
cordova plugin add cordova-plugin-statusbar
npm install bitcore-lib buffer-reverse
browserify www/js/main.js -o www/js/app.js
cordova build android
```

To install on an Android phone, connect it to your computer and type  `cordova run android`. [Developer permissions](https://developer.android.com/tools/device.html) are required. 

To install on an iPhone, replace `android` with `ios` and open the file `platforms/ios/Digital Bitbox QR.xcodeproj` in Xcode. An iOS Developer Program membership, or a jailbroke phone, is required.




