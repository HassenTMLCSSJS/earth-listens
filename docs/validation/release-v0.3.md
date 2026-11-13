# A8 release

Do not tag from a feature branch.

1. Merge the data pull requests into `develop`.
2. Open a pull request from `develop` into `main` and merge it with a merge commit. Do not squash.
3. On `main`: `git tag -a v0.3-data -m "Data views checkpoint"` and `git push origin v0.3-data`.
4. Rotate the R2 token, the Cloudflare API token, and the FIRMS key after the hackathon if they were pasted in chat.

This agent did not merge to `main` and did not push a tag.
