---
name: fix-android-network
description: "Androidリリースビルドでのネットワーク接続エラー（SocketException, Failed host lookup）を解決する"
---

# Android ネットワークエラー修正

Androidリリースビルドで `SocketException: Failed host lookup` や `No address associated with hostname` エラーが発生した場合の対処法。

## 症状

- iOSでは動作するがAndroidでは動作しない
- デバッグビルドでは動作するがリリースビルドでは動作しない
- `AuthRetryableFetchException` や `SocketException` エラーが表示される

## 原因

`android/app/src/main/AndroidManifest.xml` に `INTERNET` 権限が宣言されていない。

デバッグビルドでは自動的に権限が付与されるが、リリースビルドでは明示的な宣言が必要。

## 解決方法

`android/app/src/main/AndroidManifest.xml` の `<manifest>` タグ直後に以下を追加:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
```

## 修正後の例

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET"/>
    <application
        ...
    </application>
</manifest>
```

## 再ビルド

```bash
flutter build apk --release
```

## 関連エラー

- `ClientException with SocketException`
- `Failed host lookup`
- `No address associated with hostname, errno = 7`
- `AuthRetryableFetchException`
