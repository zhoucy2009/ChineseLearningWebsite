#!/bin/sh
set -eu

mode=${1:-full}
failed=0
secret_pattern='(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[0-9A-Za-z]{20,}|github_pat_[0-9A-Za-z_]{20,}|sk-(proj-)?[A-Za-z0-9_-]{20,}|xox[baprs]-[0-9A-Za-z-]{10,}|-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----)'

check_paths() {
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    base=${path##*/}
    case "/$path" in
      */node_modules/*|*/.DS_Store)
        echo "Blocked generated file: $path"
        failed=1
        ;;
    esac
    case "$base" in
      .env|.env.*)
        case "$base" in
          *.example) ;;
          *)
            echo "Blocked environment file: $path"
            failed=1
            ;;
        esac
        ;;
      .npmrc|.pypirc|.netrc|*.pem|*.key|*.p12|*.pfx|*.jks|*.keystore|id_rsa|id_ed25519)
        echo "Blocked credential file: $path"
        failed=1
        ;;
    esac
  done
}

scan_staged() {
  staged_files=$(git diff --cached --name-only --diff-filter=ACMR)
  check_paths <<EOF
$staged_files
EOF

  added_lines=$(git diff --cached --no-ext-diff --unified=0 --no-color |
    awk '/^\+\+\+/{next} /^\+/{sub(/^\+/, ""); print}')
  if printf '%s\n' "$added_lines" | grep -Eq "$secret_pattern"; then
    echo "Blocked: staged changes contain a value shaped like a secret."
    failed=1
  fi
}

scan_repository() {
  tracked_files=$(git ls-files)
  check_paths <<EOF
$tracked_files
EOF

  if git grep -qEI "$secret_pattern" -- .     ':(exclude)scripts/security-check.sh'     ':(exclude)package-lock.json'     ':(exclude)node_modules/**'; then
    echo "Blocked: tracked files contain a value shaped like a secret."
    git grep -nEI "$secret_pattern" -- .       ':(exclude)scripts/security-check.sh'       ':(exclude)package-lock.json'       ':(exclude)node_modules/**' |
      awk -F: '{ print $1 ":" $2 }' | sort -u
    failed=1
  fi

  for commit in $(git rev-list --all); do
    if git grep -qEI "$secret_pattern" "$commit" -- .       ':(exclude)scripts/security-check.sh'       ':(exclude)package-lock.json'       ':(exclude)node_modules/**'; then
      echo "Blocked: secret-shaped value found in commit $(git rev-parse --short "$commit")."
      failed=1
    fi
  done

  if [ -f package-lock.json ]; then
    npm_config_cache="${TMPDIR:-/tmp}/codex-security-npm-cache"       npm audit --audit-level=high --ignore-scripts
  fi
}

case "$mode" in
  --staged)
    scan_staged
    ;;
  full|--full)
    scan_repository
    ;;
  *)
    echo "Usage: $0 [--staged|--full]" >&2
    exit 2
    ;;
esac

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "Security check passed."
