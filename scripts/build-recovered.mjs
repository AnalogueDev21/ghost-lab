import { access, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import './generate-catalog-prices.mjs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(projectRoot, 'recovered-production')
const outputRoot = path.join(projectRoot, 'dist')

async function readSupabaseBrowserConfig() {
  const bundle = await readFile(path.join(sourceRoot, 'assets', 'index-vaWnYKxf.js'), 'utf8')
  const url = process.env.VITE_SUPABASE_URL || bundle.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i)?.[0]
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
    || bundle.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0]
    || bundle.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0]

  if (!url || !anonKey) throw new Error('Unable to locate the public Supabase browser configuration.')
  return { url, anonKey }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(entry => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath]
  }))
  return files.flat()
}

async function verifyAssetReferences(root = sourceRoot) {
  const files = await listFiles(root)
  const missing = new Set()

  for (const file of files.filter(item => /\.(?:html|js|css)$/.test(item))) {
    const contents = await readFile(file, 'utf8')
    const references = [
      ...contents.matchAll(/["'(]\/?assets\/([^"')?]+)/g),
      ...contents.matchAll(/(?:from\s*|import\(\s*)["']\.\/([^"']+)/g),
    ]

    for (const match of references) {
      const target = match[0].includes('assets/')
        ? path.join(root, 'assets', match[1])
        : path.resolve(path.dirname(file), match[1])
      try {
        await access(target)
      } catch {
        missing.add(path.relative(root, target))
      }
    }
  }

  if (missing.size) {
    throw new Error(`Recovered production is missing referenced assets:\n${[...missing].sort().join('\n')}`)
  }
}

await verifyAssetReferences()

await rm(outputRoot, { recursive: true, force: true })
await mkdir(outputRoot, { recursive: true })
await cp(path.join(sourceRoot, 'index.html'), path.join(outputRoot, 'index.html'))
await cp(path.join(sourceRoot, 'assets'), path.join(outputRoot, 'assets'), { recursive: true })

// A versioned asset directory prevents browsers from mixing restored bundles
// with changed files that still have the original recovered hash filenames.
const assetFiles = (await listFiles(path.join(sourceRoot, 'assets'))).sort()
const supabaseBrowserConfig = await readSupabaseBrowserConfig()
const digest = createHash('sha256')
digest.update('release-transform-20260923-order-alerts-1')
for (const file of assetFiles) digest.update(path.relative(sourceRoot, file)).update(await readFile(file))
const release = digest.digest('hex').slice(0, 16)
const versionedRoot = path.join(outputRoot, 'assets', release)
await cp(path.join(sourceRoot, 'assets'), versionedRoot, { recursive: true })
for (const file of (await listFiles(versionedRoot)).filter(file => /\.(js|css)$/.test(file))) {
  let content = await readFile(file, 'utf8')
  if (file.endsWith('.js')) {
    content = content
      .replaceAll('Ghost Chill Kitchen', 'SABINAGISA Kitchen')
      .replaceAll('GHOST CHILL', 'SABINAGISA')
      .replaceAll('Ghost Chill', 'SABINAGISA')
      .replaceAll('__SUPABASE_URL__', supabaseBrowserConfig.url)
      .replaceAll('__SUPABASE_ANON_KEY__', supabaseBrowserConfig.anonKey)
  }
  // Vite's dynamic preload map uses assets/foo; relative module imports stay local.
  await writeFile(file, content.replaceAll('assets/', `assets/${release}/`))
}
const index = await readFile(path.join(outputRoot, 'index.html'), 'utf8')
await writeFile(path.join(outputRoot, 'index.html'), index.replaceAll('/assets/', `/assets/${release}/`))
await verifyAssetReferences(outputRoot)

console.log(`Built recovered Ghost Lab production UI (${release}) with all referenced assets present.`)
