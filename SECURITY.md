# Security policy

## Reporting a problem

Open an issue or a pull request and I'll take a look.

You can also report privately: open the repository's **Security** tab and choose **Report a vulnerability**. A confirmed problem is fixed in a new release, and the advisory is published once the fix is on npm.

This is a one-person project with no bug bounty and no response deadline. I'll reply when I can and say what I plan to do.

## Supported versions

Only the latest version gets security fixes.

## What this package is not

Not a cryptographic random number generator. PCG32 and the seeds are built to be reproducible: anyone with a seed can regenerate everything from it, by design. Do not use them for secrets, tokens or anything an attacker must not predict.
