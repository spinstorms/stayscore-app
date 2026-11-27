#!/bin/bash
OUT="$1"; mkdir -p "$OUT"
adb install -r app.apk
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb shell pm grant com.stayodds.app android.permission.ACCESS_FINE_LOCATION || true
adb shell monkey -p com.stayodds.app -c android.intent.category.LAUNCHER 1; sleep 30
adb exec-out screencap -p > "$OUT/01-home.png"
i=2
for p in explore map compare insights videos; do
  adb shell am start -a android.intent.action.VIEW -d "stayodds:///$p" com.stayodds.app; sleep 15
  adb exec-out screencap -p > "$OUT/0$i-$p.png"; i=$((i+1))
done
ls -la "$OUT"
