import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Usage:
//   npm run build:demo                         rebuild every demo (unchanged behaviour)
//   npm run build:demo -- --only <folder>      rebuild only ../demo-sites/<folder>
const onlyFlag = process.argv.indexOf('--only')
const only = onlyFlag > -1 ? process.argv[onlyFlag + 1] : process.argv.find((a) => a.startsWith('--only='))?.slice(7)

const siteRoot = resolve(__dirname, '..')
const codeRoot = resolve(siteRoot, '..')
const publicRoot = resolve(siteRoot, 'public')

function run(command, cwd) {
  execSync(command, { cwd, stdio: 'inherit' })
}

function copyFreshDir(source, destination) {
  rmSync(destination, { recursive: true, force: true })
  mkdirSync(destination, { recursive: true })
  cpSync(source, destination, { recursive: true })
}

function rewriteRootUrls(indexFilePath, basePath) {
  if (!existsSync(indexFilePath)) {
    return
  }

  const html = readFileSync(indexFilePath, 'utf8')
  const folderPrefix = basePath.replace(/^\//, '').replace(/\/$/, '')
  const rewritten = html.replace(
    /(src|href)="\/(?!\/)/g,
    (match, attr, offset, source) => {
      const valueStart = offset + `${attr}="`.length
      const rest = source.slice(valueStart)
      const normalizedRest = rest.startsWith('/') ? rest.slice(1) : rest
      if (normalizedRest.startsWith(`${folderPrefix}/`)) {
        return match
      }
      return `${attr}="${basePath}`
    },
  )

  writeFileSync(indexFilePath, rewritten, 'utf8')
}

function buildViteDemo(projectFolderName, destinationFolderName) {
  const projectPath = resolve(codeRoot, projectFolderName)
  const distPath = resolve(projectPath, 'dist')
  const destinationPath = resolve(publicRoot, destinationFolderName)

  run('npm run build', projectPath)
  copyFreshDir(distPath, destinationPath)
  rewriteRootUrls(resolve(destinationPath, 'index.html'), `/${destinationFolderName}/`)
}

if (!only) {
  buildViteDemo('survivor-react-engine', 'demo')

  copyFreshDir(
    resolve(codeRoot, 'equalization-anywhere-plugin', 'site'),
    resolve(publicRoot, 'demo-equalization-anywhere'),
  )

  copyFreshDir(
    resolve(codeRoot, 'equalization-anywhere-plugin', 'shared'),
    resolve(publicRoot, 'shared'),
  )

  buildViteDemo('nitro-type', 'demo-nitro-type')
  buildViteDemo('timing-trainer', 'demo-timing-trainer')
}

// ─── Demo Sites ──────────────────────────────────────────────────────────────
// Auto-discovers all sub-folders in ../demo-sites/ that have a build script
// and publishes them to public/demo-sites/<folder-name>/.
//
// To add a new demo site:
//   1. Drop a Vite project into ../demo-sites/<your-project>/
//   2. Ensure it has a "build" npm script
//   3. Run `npm run build:demo` from this repo (add `-- --only <folder>` for just one)
//   4. Commit the generated public/demo-sites/<your-project>/ output
// ─────────────────────────────────────────────────────────────────────────────

const demoSitesRoot = resolve(codeRoot, 'demo-sites')

/**
 * Builds a Vite project inside demo-sites/ and copies its output to
 * public/demo-sites/<folderName>/.  The Vite --base flag is injected via
 * npm script passthrough so the deployed assets resolve at the right path.
 */
function buildDemoSite(folderName) {
  const projectPath = resolve(demoSitesRoot, folderName)
  const distPath = resolve(projectPath, 'dist')
  const base = `/demo-sites/${folderName}/`
  const destinationPath = resolve(publicRoot, 'demo-sites', folderName)

  // Install dependencies if node_modules is missing
  if (!existsSync(resolve(projectPath, 'node_modules'))) {
    console.log(`[demo-sites] Installing dependencies for ${folderName}…`)
    run('npm install', projectPath)
  }

  // `-- --base=…` passes the Vite base through the npm script
  run(`npm run build -- --base=${base}`, projectPath)
  copyFreshDir(distPath, destinationPath)
  rewriteRootUrls(resolve(destinationPath, 'index.html'), base)
  console.log(`[demo-sites] Built ${folderName} → public/demo-sites/${folderName}/`)
}

if (existsSync(demoSitesRoot)) {
  const entries = readdirSync(demoSitesRoot, { withFileTypes: true })
  let built = 0
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (only && entry.name !== only) continue
    const pkgPath = resolve(demoSitesRoot, entry.name, 'package.json')
    if (!existsSync(pkgPath)) continue
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    if (!pkg.scripts?.build) continue
    buildDemoSite(entry.name)
    built++
  }
  if (only && built === 0) {
    console.error(`[demo-sites] No demo site "${only}" with a build script in ../demo-sites/.`)
    process.exit(1)
  }
} else {
  console.log('[demo-sites] No demo-sites directory found, skipping.')
}
