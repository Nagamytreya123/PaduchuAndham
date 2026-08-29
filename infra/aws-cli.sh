# Resolve AWS CLI on Windows (Git Bash / WSL) and Linux.
aws() {
  local py=""
  for candidate in \
    "/mnt/c/Users/ng185157/AppData/Local/Programs/Python/Python312/python.exe" \
    python3 python; do
    if [[ -x "$candidate" ]] || command -v "$candidate" >/dev/null 2>&1; then
      if "$candidate" -m awscli --version >/dev/null 2>&1; then
        py="$candidate"
        break
      fi
    fi
  done
  if [[ -n "$py" ]]; then
    "$py" -m awscli "$@"
    return
  fi
  if command -v aws >/dev/null 2>&1; then
    command aws "$@"
    return
  fi
  echo "AWS CLI not found" >&2
  return 127
}
