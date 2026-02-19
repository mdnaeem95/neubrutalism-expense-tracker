import React, { useState } from 'react';
import { Platform, View } from 'react-native';

// Native module may not be available in Expo Go — lazy-load to avoid crash
let mobileAds: any;
let BannerAd: any;
let BannerAdSize: any;
let InterstitialAd: any;
let AdEventType: any;
let nativeAdsAvailable = false;

try {
  const ads = require('react-native-google-mobile-ads');
  mobileAds = ads.default;
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  InterstitialAd = ads.InterstitialAd;
  AdEventType = ads.AdEventType;
  nativeAdsAvailable = true;
} catch {
  // Native module not available (Expo Go) — ads will be no-ops
}

const BANNER_ID = nativeAdsAvailable
  ? Platform.select({
      ios: 'ca-app-pub-3113906121142395/4642323987',
      android: 'ca-app-pub-3113906121142395/4642323987',
    })!
  : '';

const INTERSTITIAL_ID = nativeAdsAvailable
  ? Platform.select({
      ios: 'ca-app-pub-3113906121142395/5092481207',
      android: 'ca-app-pub-3113906121142395/5092481207',
    })!
  : '';

export async function initializeAds() {
  if (!nativeAdsAvailable) return;
  await mobileAds().initialize();
}

// --- Interstitial Ad ---

let interstitialAd: any = null;
let interstitialLoaded = false;

function createAndLoadInterstitial() {
  if (!nativeAdsAvailable) return;
  interstitialAd = InterstitialAd.createForAdRequest(INTERSTITIAL_ID);

  interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
  });

  interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
    interstitialLoaded = false;
    // Preload the next one
    createAndLoadInterstitial();
  });

  interstitialAd.addAdEventListener(AdEventType.ERROR, () => {
    interstitialLoaded = false;
  });

  interstitialAd.load();
}

export function loadInterstitial() {
  if (!nativeAdsAvailable) return;
  if (!interstitialAd) {
    createAndLoadInterstitial();
  }
}

export async function showInterstitial(): Promise<boolean> {
  if (!nativeAdsAvailable || !interstitialLoaded || !interstitialAd) return false;
  interstitialAd.show();
  interstitialLoaded = false;
  return true;
}

// --- Banner Ad Component ---

interface AdBannerProps {
  style?: View['props']['style'];
}

export function AdBanner({ style }: AdBannerProps) {
  const [hasError, setHasError] = useState(false);

  if (!nativeAdsAvailable || hasError) return null;

  return (
    <View style={style}>
      <BannerAd
        unitId={BANNER_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setHasError(true)}
      />
    </View>
  );
}
