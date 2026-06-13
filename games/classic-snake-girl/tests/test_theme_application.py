import pathlib
import re
import unittest


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
INDEX_HTML = (PROJECT_ROOT / "index.html").read_text(encoding="utf-8")
HOME_HTML = (PROJECT_ROOT / "home.html").read_text(encoding="utf-8")
GAME_HTML = (PROJECT_ROOT / "game.html").read_text(encoding="utf-8")


def extract_theme_ids_from_shop(html: str) -> set[str]:
    pattern = re.compile(r'\{\s*id:\s*"(theme-[^"]+)"\s*,\s*type:\s*"theme"', re.MULTILINE)
    return set(pattern.findall(html))


class ThemeApplicationTest(unittest.TestCase):
    def test_home_shop_theme_entries_exist(self):
      theme_ids = extract_theme_ids_from_shop(HOME_HTML)
      self.assertEqual(theme_ids, {"theme-neon", "theme-sunset", "theme-ice", "theme-aurora"})
      self.assertIn('title: "末日脉冲"', HOME_HTML)

    def test_home_has_theme_class_map_and_logging(self):
      self.assertIn('const THEME_CLASS_MAP = Object.freeze({', HOME_HTML)
      self.assertIn('window.__classicSnakeGirlThemeLogs', HOME_HTML)
      self.assertIn('function applyThemeSafely', HOME_HTML)
      self.assertIn('const THEME_EVENT = "classic-snake-girl:theme-applied";', HOME_HTML)

    def test_home_theme_scope_targets_cover_reward_task_shop(self):
      self.assertIn("reward:", HOME_HTML)
      self.assertIn("task:", HOME_HTML)
      self.assertIn("shop:", HOME_HTML)
      self.assertIn('"#rewardGrid"', HOME_HTML)
      self.assertIn('"#taskList"', HOME_HTML)
      self.assertIn('"#shopGrid"', HOME_HTML)

    def test_home_css_has_all_non_default_theme_blocks(self):
      for theme_class in ("theme-sunset", "theme-ice", "theme-aurora"):
        self.assertIn(f"body.{theme_class} {{", HOME_HTML)

    def test_home_sunset_theme_overrides_visual_tokens(self):
      sunset_block = re.search(r"body\.theme-sunset\s*\{(?P<body>[\s\S]*?)\n\s*\}", HOME_HTML)
      self.assertIsNotNone(sunset_block)
      block = sunset_block.group("body")
      for token in (
        "--pixel-surface-main",
        "--pixel-surface-soft",
        "--pixel-surface-accent",
        "--primary-button-bg",
        "--active-card-bg",
        "--selected-card-bg",
      ):
        self.assertIn(token, block)

    def test_game_supports_same_theme_classes(self):
      self.assertIn("const GAME_THEME_CLASS_MAP = Object.freeze({", GAME_HTML)
      self.assertIn("function applyGameplayTheme", GAME_HTML)
      for theme_class in ("theme-sunset", "theme-ice", "theme-aurora"):
        self.assertIn(f"body.{theme_class} {{", GAME_HTML)

    def test_loading_page_uses_fast_entry_gate_and_local_matter(self):
      self.assertIn('const FAST_ENTRY_GATE_MS = 2200;', INDEX_HTML)
      self.assertIn('url: "vendor/matter.min.js"', INDEX_HTML)
      self.assertNotIn('url: "music/bgm01.mp3"', INDEX_HTML)
      self.assertIn('priority: "critical"', INDEX_HTML)
      self.assertIn('function withTimeout(', INDEX_HTML)
      self.assertIn('Promise.allSettled(criticalTasks)', INDEX_HTML)

    def test_game_uses_local_matter_and_runtime_safe_area_tokens(self):
      self.assertIn('<script src="vendor/matter.min.js"></script>', GAME_HTML)
      self.assertIn("--viewport-safe-bottom", GAME_HTML)
      self.assertIn("--ui-safe-bottom", GAME_HTML)
      self.assertIn("function syncViewportCSSVars()", GAME_HTML)
      self.assertIn("window.visualViewport.addEventListener", GAME_HTML)


if __name__ == "__main__":
    unittest.main()
