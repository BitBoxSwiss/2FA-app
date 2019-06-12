## Smart Verification & Two Factor Authentication mobile app


Use with the [BitBox01](https://shiftcrypto.ch) hardware wallet for added security.


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
cd 2FA-app
cordova prepare
npm install

Insert after “buildscript” in “platforms/android/app/build.gradle”:
configurations.all {
   resolutionStrategy {
       force 'com.android.support:support-v4:27.1.0'
   }
}

# After code edits:
browserify www/js/main_new.js -o www/js/app_new.js && browserify www/js/init.js -o www/js/app_init.js && browserify www/js/main_old.js -o www/js/app_old.js
cordova build android
```

To install on an Android phone, connect it to your computer and type  `cordova run android`. [Developer permissions](https://developer.android.com/tools/device.html) are required.

To install on an iPhone, replace `android` with `ios` and open the file `platforms/ios/Digital Bitbox QR.xcodeproj` in Xcode. An iOS Developer Program membership, or a jailbroke phone, is required.

## Development

It's easier to develop in the browser. Setup with `cordova platform add browser`. Start server with `cordova run browser`. Your default browser starts, but to allow cross origin requests,
run chrome like `chromium-browser --disable-web-security --user-data-dir`.

After code edits: `browserify www/js/main_new.js -o www/js/app_new.js && browserify www/js/init.js -o www/js/app_init.js && browserify www/js/main_old.js -o www/js/app_old.js && cordova prepare browser` (and then just refresh the page).
