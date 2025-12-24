# Contributing to Tagzzs
Thank you for showing interest in contributing to Tagzzs! All kinds of contributions are valuable to us.In this guide, we will cover how you can quickly onboard and make your first contribution.

## Submitting an Issue
Before submitting a new issue, please search the [issues](https://github.com/Tagzzs/tagzzs/issues) tab. Maybe an issue or discussion already exists and might inform you of workarounds. Otherwise, you can provide new imformation.

While we want to fix all the [issues](https://github.com/Tagzzs/tagzzs/issues), before fixing a bug we need to be able to reproduce and confirm it. Please provide us with a minimal reproduction scenario using a repository or Gist. Having a live, reproducible scenario gives us the information without asking questions back & forth such as:

- steps to reproduce the issue
- Expected vs. actual behvior
- Environment details (OS, browser, versions, etc.)
- Screenshots or logs (if applicable)

without providing above details we won't be able to investigate all [issues](https://github.com/Tagzzs/tagzzs/issues), and the issue might not be resolved.

you can open a new issue with this [issue form](https://github.com/Tagzzs/tagzzs/issues/new).

Naming conventions for issues
When opening a new issue, please use a clear and concise title that follows this format:

- For bugs: [short description]
- For features: [short description]
- For improvements: [short description]
- For documentation: [short description]

### Examples:

-  Bug: YouTube extraction fails for age-restricted videos
-  Docs: Setup guide for local development
-  Feature: Support for podcast URL extraction
-  Improvement: Optimize semantic search performance

This helps in managing issues more efficiently.


## Coding Guidlines
Ensure to follow the same codebase structure including formatting with consistency.

- Frontend
  - Linting methods can be used i.e [eslint](https://eslint.org/docs/latest/) and for formatting use [prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) extension in VS Code.
  - Before generating pull request use **npm run build** and fix all the build errors.
  - Add comments for complex logics.

- Backend 
  - Use [Ruff](https://marketplace.visualstudio.com/items?itemName=charliermarsh.ruff) for formatting and linting.
  - Write docstring for function and classes.

## Generating a Pull Request

1. **Create a branch and name it same as issue**.

    > git checkout -b "branch-name"

2. **Write proper commit messages with proper description and changes made**
    > eg:- fix(youtube): resolve import error in output_structuring.
    >
    > The output_structuring.py was importing from 'utils' instead of 'app.utils', causing ModuleNotFoundError when extracting YouTube content. Updated import statements to use absolute paths.
    >
    > Fixes #42.

3. **Push to your fork**
    > git push fork "branch-name".

4. **Create a pull request**
    - Clear title and description
    - mention issue in description with proper closing keywords (eg- fixes #1 ).
    - Provide screenshots (if required).
    - Provide testing instructions.
5. **Request review from maintainers**

## Need Help? Questions and Suggestions
Questions, suggestions, and thoughts are most welcome! You can reach us at:
- [**Github Issues**](https://github.com/Tagzzs/tagzzs/issues) : Report bugs and request features
- [**Discussions**](https://github.com/Tagzzs/tagzzs/discussions) : Ask question and share ideas
- [**Twitter**](https://x.com/TAGZS_OFFICIAL) : For more updates!
- [**Discord**]() : Coming Soon!

## Code of Conduct
Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

---
