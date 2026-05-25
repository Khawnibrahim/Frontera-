#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -z "${SES_FROM_EMAIL:-}" ]]; then
  echo "Warning: SES_FROM_EMAIL is not set. Deploy will skip SES EmailIdentity."
  echo "  Set SES_FROM_EMAIL in .env (verified address) before sending mail."
fi

npm run build
npx serverless deploy --stage "${SLS_STAGE:-dev}" "$@"

echo ""
echo "After deploy:"
echo "  1. SES → Verified identities: confirm ${SES_FROM_EMAIL:-your sender} is Verified"
echo "  2. New SES accounts are in sandbox — verify recipient emails or request production access"
echo "  3. API URL is in the stack Outputs (ApiUrl)"
