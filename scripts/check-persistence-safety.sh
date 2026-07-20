#!/usr/bin/env bash
#
# Pre-push guard: flag changes that could affect user progress or
# persistent saves. Runs against the diff being pushed so authors
# must explicitly acknowledge persistence-touching changes.
#
# Exit 0  = clean (no persistence-sensitive changes)
# Exit 1  = persistence-sensitive files changed — prints a checklist
#
# The check compares the push range; falls back to origin/main.

set -euo pipefail

# Determine the diff range: pre-push receives lines on stdin with
# <local-ref> <local-sha> <remote-ref> <remote-sha>. If running
# standalone (no stdin), diff against origin/main.
BASE="${PERSISTENCE_CHECK_BASE:-origin/main}"
if ! [ -t 0 ]; then
  while read -r _ local_sha _ remote_sha; do
    if [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
      BASE="origin/main"
    else
      BASE="$remote_sha"
    fi
  done
fi

# Files whose changes can affect saved user progress.
SENSITIVE_PATTERNS=(
  'src/lib/daily/persistence.ts'
  'src/lib/storage/'
  'src/lib/puzzleKey.ts'
  'src/lib/words/dictionary.ts'
  'src/games/*/state/persistence.ts'
  'src/games/*/state/persistence.dom.test.ts'
)

# Build a single grep pattern from the file paths.
changed_files=$(git diff --name-only "$BASE"...HEAD 2>/dev/null || git diff --name-only "$BASE" HEAD)

matched=()
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
  # Use grep with fnmatch-style via bash
  while IFS= read -r f; do
    # shellcheck disable=SC2254
    case "$f" in
      $pattern) matched+=("$f") ;;
    esac
  done <<< "$changed_files"
done

# Also flag DICT_VERSION changes specifically — even in files not in
# the sensitive list, a DICT_VERSION bump has historically wiped saves.
dict_version_files=()
if [ -n "$changed_files" ]; then
  while IFS= read -r f; do
    # Documentation files can mention DICT_VERSION without affecting saves.
    [[ "$f" == docs/* ]] && continue
    [ -n "$f" ] && dict_version_files+=("$f")
  done < <(echo "$changed_files" | xargs grep -l 'DICT_VERSION' 2>/dev/null || true)
fi

# Check if any persistence interface shapes changed (DailyBase,
# DailyProgress, StreakStats field additions/removals).
interface_changes=false
for f in "${matched[@]}"; do
  if git diff "$BASE"...HEAD -- "$f" 2>/dev/null | grep -qE '^\+.*interface (DailyBase|DailyProgress|DayProgress|StreakStats)' || \
     git diff "$BASE"...HEAD -- "$f" 2>/dev/null | grep -qE '^\+.*puzzleKey|^\+.*dictVersion|^\-.*dictVersion'; then
    interface_changes=true
    break
  fi
done

if [ ${#matched[@]} -eq 0 ] && [ ${#dict_version_files[@]} -eq 0 ]; then
  exit 0
fi

# Something persistence-sensitive changed — print the checklist.
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           ⚠  PERSISTENCE SAFETY CHECK  ⚠                  ║"
echo "║  Changes touch files that affect user saves and progress.  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

if [ ${#matched[@]} -gt 0 ]; then
  echo "Persistence-sensitive files changed:"
  for f in "${matched[@]}"; do
    echo "  • $f"
  done
  echo ""
fi

if [ ${#dict_version_files[@]} -gt 0 ]; then
  echo "Files referencing DICT_VERSION changed:"
  for f in "${dict_version_files[@]}"; do
    echo "  • $f"
  done
  echo ""
fi

echo "Review checklist (user progress is sacred):"
echo ""
echo "  □ Existing saves load correctly after this change"
echo "    - Saves WITH puzzleKey: fingerprint still matches?"
echo "    - Saves WITHOUT puzzleKey (legacy): dictVersion fallback works?"
echo ""
echo "  □ No unintended save invalidation"
echo "    - If DICT_VERSION bumped: is it necessary for THIS game?"
echo "    - Does the bump affect other games' saves?"
echo "    - Each game's puzzleKey covers the right identity fields?"
echo ""
echo "  □ Save shape changes are backwards-compatible"
echo "    - New fields are optional (old saves won't have them)"
echo "    - Removed fields have fallback handling"
echo "    - validDay() still accepts old save shapes"
echo ""
echo "  □ Write guards are intact"
echo "    - Solved saves are never overwritten with unsolved"
echo "    - Older builds can't clobber newer builds' saves"
echo "    - Multi-tab ownership rules preserved"
echo ""
echo "  □ Stats integrity"
echo "    - played/solved counts don't double-increment"
echo "    - Streak logic handles grace day correctly"
echo "    - statsRecorded marker prevents replay re-counting"
echo ""
echo "  □ Tests cover the change"
echo "    - persistence.dom.test.ts updated if save shape changed"
echo "    - Hydration from old saves tested (legacy compat)"
echo ""

if [ "$interface_changes" = true ]; then
  echo "  ⚡ Interface shape changes detected — extra care needed:"
  echo "    - Run the full persistence DOM test suite"
  echo "    - Test hydration from a save written by the CURRENT build"
  echo ""
fi

echo "If you've verified all applicable items, push with:"
echo "  git push --no-verify"
echo ""
exit 1
