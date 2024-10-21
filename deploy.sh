#!/bin/bash

# Increment build number
cd ios
xcrun agvtool next-version -all

# Clean the build directory
xcodebuild clean -workspace CLTMeet.xcworkspace -scheme CLTMeet -configuration Release

# Build and archive
xcodebuild -workspace CLTMeet.xcworkspace \
            -scheme CLTMeet \
            -sdk iphoneos \
            -configuration Release \
            -archivePath ./build/CLTMeet.xcarchive \
            archive

# Export the archive
xcodebuild -exportArchive \
            -archivePath ./build/CLTMeet.xcarchive \
            -exportPath ./build/CLTMeet \
            -exportOptionsPlist ExportOptions.plist

# Upload to TestFlight
xcrun altool --upload-app \
            --file ./build/CLTMeet/CLTMeet.ipa \
            --type ios \
            --username "kookygavinquack@gmail.com" \
            --password "ppir-idqe-mbkg-ujws"
