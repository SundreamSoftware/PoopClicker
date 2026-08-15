# Capacitor / Cordova bridge — required when minifyEnabled is true.
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }
-dontwarn com.getcapacitor.**
-keep public class * extends com.getcapacitor.Plugin
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin *;
    @com.getcapacitor.PluginMethod *;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Play Billing, AdMob, Firebase used by native plugins.
-keep class com.android.vending.billing.** { *; }
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.internal.ads.** { *; }
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

-keepattributes *Annotation*
-keepattributes JavascriptInterface
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
