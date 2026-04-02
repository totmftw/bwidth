---
name: check-translations
description: |
  Supabase MCPを使用してDBの日本語テキストの英語翻訳状況をチェックし、不足分を追加する。
  トリガー: 「翻訳チェック」「translation check」「英語翻訳」「i18n」「多言語対応」
---

# 日本語テキストの英語翻訳チェック・追加

## 対象テーブル

| テーブル | 日本語カラム | 英語カラム |
|---------|------------|-----------|
| scenarios | title, description, summary, truth_story | title_en, description_en, summary_en, truth_story_en |
| characters | default_name, role, public_profile, secret_profile, victory_conditions | default_name_en, role_en, public_profile_en, secret_profile_en, victory_conditions_en |
| investigation_cards | location_name, content, condition_item, grants_item | location_name_en, content_en, condition_item_en, grants_item_en |
| action_items | name, description, effect_description, usage_timing | name_en, description_en, effect_description_en, usage_timing_en |

## 手順

1. `mcp__supabase__list_projects` でプロジェクトID取得
2. 下記SQLで翻訳状況チェック
3. `mcp__supabase__execute_sql` でUPDATE実行
4. 必要ならFlutterモデル更新 → `flutter pub run build_runner build --delete-conflicting-outputs`

## チェック用SQL

```sql
-- scenarios
SELECT id, title,
  CASE WHEN title_en IS NULL THEN 'MISSING' ELSE 'OK' END as title_en,
  CASE WHEN description_en IS NULL THEN 'MISSING' ELSE 'OK' END as desc_en,
  CASE WHEN summary_en IS NULL THEN 'MISSING' ELSE 'OK' END as summary_en,
  CASE WHEN truth_story_en IS NULL THEN 'MISSING' ELSE 'OK' END as truth_en
FROM scenarios;

-- characters
SELECT id, default_name,
  CASE WHEN default_name_en IS NULL THEN 'MISSING' ELSE 'OK' END as name_en,
  CASE WHEN role_en IS NULL THEN 'MISSING' ELSE 'OK' END as role_en,
  CASE WHEN public_profile_en IS NULL THEN 'MISSING' ELSE 'OK' END as public_en,
  CASE WHEN secret_profile_en IS NULL THEN 'MISSING' ELSE 'OK' END as secret_en,
  CASE WHEN victory_conditions_en IS NULL THEN 'MISSING' ELSE 'OK' END as vc_en
FROM characters;

-- investigation_cards (集計)
SELECT COUNT(*) as total,
  SUM(CASE WHEN location_name_en IS NULL THEN 1 ELSE 0 END) as location_missing,
  SUM(CASE WHEN content_en IS NULL THEN 1 ELSE 0 END) as content_missing
FROM investigation_cards;

-- action_items
SELECT id, name,
  CASE WHEN name_en IS NULL THEN 'MISSING' ELSE 'OK' END as name_en,
  CASE WHEN description_en IS NULL THEN 'MISSING' ELSE 'OK' END as desc_en
FROM action_items;
```

## 翻訳ルール

- ゲームの雰囲気を保つ自然な英語
- 固有名詞はローマ字表記（例: Haijima → Haijima）
- victory_conditions: JSONB配列内の各descriptionを翻訳
