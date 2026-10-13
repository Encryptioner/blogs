# B-29 Facebook (English)

I tested whether Bun can replace Node in two large production codebases, one tier at a time, on throwaway copies.

The honest result: great as a package manager and script launcher, not ready as a production server runtime, and not a drop-in for a webpack-based Vue app. One surprise: it was not faster than pnpm at installing on a warm cache. Another: the server exited on its own about 30 seconds after a database failure, which Node did not do, and I could not explain why.

If you are thinking about Bun for a big project, migrate in steps, each with a rollback. Full write-up with numbers and references:
https://github.com/Encryptioner/blogs/blob/master/topics/Development/Bun/Can%20Bun%20Replace%20Node%20in%20a%20Large%20Production%20Monorepo%20-%20A%20Tiered%20Migration%20Field%20Report.md

Source: Bun official docs. More in the post.
