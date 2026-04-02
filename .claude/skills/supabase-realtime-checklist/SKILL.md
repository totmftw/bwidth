---
name: supabase-realtime-checklist
description: "Supabase Realtimeが動作しない場合のトラブルシューティング手順（Publication、RLSポリシー、Flutterコード）"
---

# Supabase Realtime 同期チェックリスト

Supabaseでリアルタイム同期が動かない場合、以下の3つを必ず確認すること。

## 1. Realtime Publication に追加されているか

```sql
-- 確認
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 追加
ALTER PUBLICATION supabase_realtime ADD TABLE テーブル名;
```

## 2. RLS (Row Level Security) ポリシーが正しいか

**最重要**: SELECTポリシーが「自分のデータのみ」になっていないか確認。

### 悪い例（自分のデータのみ）
```sql
-- これだと他のプレイヤーのデータが見えない
player_id IN (SELECT id FROM room_players WHERE user_id = auth.uid())
```

### 良い例（同じルームの全員のデータ）
```sql
-- votesテーブルと同じパターン - ルームメンバー全員が見れる
room_id IN (SELECT room_id FROM room_players WHERE user_id = auth.uid())
```

### RLSポリシー確認コマンド
```sql
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'テーブル名';
```

### 動作しているテーブルのポリシーと比較
```sql
-- votesは動作している → これを参考にする
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'votes';
```

## 3. Flutter側のコードパターン

### StreamProviderの使い方
```dart
// Provider定義 (game_provider.dart)
@riverpod
Stream<Map<String, List<String>>> roomAchievements(Ref ref, String roomId) {
  final service = ref.watch(gameServiceProvider);
  return service.watchAchievementsForRoom(roomId);
}

// Service実装
Stream<Map<String, List<String>>> watchAchievementsForRoom(String roomId) {
  return _supabase
      .from('achievements')
      .stream(primaryKey: ['id'])
      .eq('room_id', roomId)
      .map((data) => /* 変換処理 */);
}
```

### UI側での正しい使い方
```dart
// NG: .value で取り出すと更新が反映されない場合がある
final data = asyncValue.value ?? {};

// OK: .when() でUIを直接構築する
achievementsAsync.when(
  data: (achievements) {
    // ここでUIを返す
    return Text('${achievements.length}人');
  },
  loading: () => const SizedBox.shrink(),
  error: (_, __) => const SizedBox.shrink(),
),
```

## トラブルシューティング手順

1. **他の動作しているテーブル（votes等）と比較**
2. **Realtime publication を確認**
3. **RLSポリシーを確認（特にSELECT）**
4. **Flutter側で `.when()` パターンを使っているか確認**

## このプロジェクトでの実例

### achievementsテーブルの問題
- **症状**: ホストが他プレイヤーのachievements送信を検知できない
- **原因**: RLSポリシーが `player_id` ベースで自分のみ見れる設定だった
- **解決**: `room_id` ベースに変更して同じルームの全員が見れるように

```sql
-- 修正前
CREATE POLICY "Achievements are viewable by achiever" ON achievements
FOR SELECT USING (player_id IN (SELECT id FROM room_players WHERE user_id = auth.uid()));

-- 修正後
CREATE POLICY "Achievements are viewable by room members" ON achievements
FOR SELECT USING (room_id IN (SELECT room_id FROM room_players WHERE user_id = auth.uid()));
```
