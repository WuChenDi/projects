# Repository Changelog

Powerful web-based tool for tracking releases and changelogs from your favorite open source repositories. Monitor multiple GitHub projects in one unified dashboard.

⚠️ **Privacy-focused** - All searches and selections are processed in your browser. No data is stored on our servers.

Preview: https://repo-changelog.vercel.app/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/repo-changelog/index.png)
![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/repo-changelog/repos.png)

## ✨ Features

### 🔍 **Smart Repository Search**
- 🎯 Search by repository name (`owner/repo`) or username/organization
- 🚀 Real-time search with intelligent validation
- 📊 Sort results by stars, forks, name, or last updated
- 🏃‍♂️ Runs fully in the browser (no server queries for search logic)
- 🔒 Privacy-focused

**Supported Search Types:**
- Individual repositories: `nuxt/nuxt`, `microsoft/vscode`
- User repositories: `sindresorhus`, `tj`
- Organization repositories: `vercel`, `better-auth`

### 📋 **Multi-Repository Tracking** 
- 🎨 Select and manage multiple repositories
- 💾 Persistent selections via URL sharing
- ⚡ Instant add/remove with visual feedback
- 📱 Responsive selection interface
- 🌐 Share repository combinations with others

### 📰 **Unified Changelog Dashboard**
- 🚀 Chronological timeline of releases across all selected repos
- 🎚️ Expandable/collapsible release notes with full markdown rendering
- 📏 Repository badges and metadata display
- 💾 Direct links to GitHub releases
- 🔒 Local processing ensures fast loading
- 🌐 Beautiful responsive timeline design

**Technologies:**
- Powered by GitHub API for real-time release data
- Markdown rendering with [@nuxtjs/mdc](https://github.com/nuxt-content/mdc)
- Browser-based processing with intelligent caching

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Modern browser (Chrome, Firefox, Safari, Edge)

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/WuChenDi/projects.git
cd projects

# Install dependencies
pnpm install

# Start development server
pnpm dev:repo-changelog
# Server available at http://localhost:3019
```

### Production Build

```bash
# Build for production
pnpm --filter repo-changelog run build

# Preview production build
pnpm --filter repo-changelog run preview

# Deploy to your favorite platform
```

## 📜 License

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
