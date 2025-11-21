# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a personal blog and presentation repository containing technical articles on various software engineering topics. Content is organized by topic and published to multiple platforms (DEV Community, Medium, Nerddevs).

## Repository Structure

```
blogs/
├── topics/                   # Blog posts organized by category
│   ├── Node.js/              # Node.js related content
│   ├── Productivity/         # Productivity tips and tools
│   └── Coding Challenges/    # Technical challenges and tutorials
├── presentations/            # Presentation materials
├── nerddevs/                 # Content for Nerddevs platform
├── assets/                   # Blog-specific assets organized by blog number
│   ├── B-6/                  # Assets for blog #6
│   └── B-7/                  # Assets for blog #7
├── INDEX.md                  # Numbered index of all content
└── README.md                 # Main repository overview with links by topic
```

## Content Management

### Blog Organization
- **INDEX.md**: Maintains a numbered list of all blogs and presentations in chronological order
- **README.md**: Groups content by topic with direct links to blog files
- Blog files use descriptive titles as filenames (e.g., `Publishing Your First NPM Package: A Real-World Guide That Actually Helps.md`)

### Asset Management
- Assets are stored in `assets/B-{number}/` directories
- Each blog gets its own folder (B-6, B-7, etc.) for associated images, diagrams, or supplementary files
- Asset folder numbers correspond to the blog number in INDEX.md

### Branch Naming Convention
Branches follow the pattern: `B-{number}/task/{topic}/{brief-description}`
- Example: `B-7/task/v1/publishing-npm-package`
- The number matches the blog number and its assets folder

## Common Workflows

### Adding a New Blog Post
1. Determine the next blog number from INDEX.md
2. Create a new branch: `B-{number}/task/{topic}/{slug}`
3. Write the blog in the appropriate `topics/{category}/` directory
4. Create `assets/B-{number}/` folder for any images or supporting files
5. Update INDEX.md with the new numbered entry
6. Update README.md with the new link under the appropriate topic section
7. Commit and create a PR to master

### Updating Existing Content
- Blog posts may have multiple versions (v1, v2) as indicated in filenames
- When creating revised versions, keep previous versions for reference
- Update both INDEX.md and README.md if the title changes

### Publishing Platforms
Content from this repository is published to:
- DEV Community (https://dev.to/mir_mursalin_ankur)
- Medium (https://mir-mursalin-ankur.medium.com/)
- Nerddevs (https://nerddevs.com/author/ankur/)

## File Naming Conventions
- Use descriptive, human-readable filenames for blog posts
- Preserve exact titles including special characters (emojis, punctuation)
- Spaces in filenames are acceptable and used throughout the repository
- Version indicators (v1, v2) are appended to distinguish iterations

## Development Notes
- This is a content-only repository with no build process, tests, or runtime code
- All content is in Markdown format
- No package.json or dependencies to manage
