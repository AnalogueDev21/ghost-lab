import { access, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import './generate-catalog-prices.mjs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(projectRoot, 'recovered-production')
const outputRoot = path.join(projectRoot, 'dist')

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
const digest = createHash('sha256')
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
      // Branch names come from Supabase in finance filters; normalize the
      // legacy chill branch label at render-data boundaries as well.
      .replaceAll('h(n),!g&&n[0]&&d(n[0].key)', 'h(n.map(o=>o.key==="chill"?{...o,name:"SABINAGISA"}:o)),!g&&n[0]&&d(n[0].key)')
      .replaceAll('c(r),!m&&r[0]&&S(r[0].key)', 'c(r.map(s=>s.key==="chill"?{...s,name:"SABINAGISA"}:s)),!m&&r[0]&&S(r[0].key)')
      .replaceAll('u(r||[]),k(!1)', 'u((r||[]).map(s=>s.branches&&s.branches.key==="chill"?{...s,branches:{...s.branches,name:"SABINAGISA"}}:s)),k(!1)')
  }
  // Vite's dynamic preload map uses assets/foo; relative module imports stay local.
  await writeFile(file, content.replaceAll('assets/', `assets/${release}/`))
}
const index = await readFile(path.join(outputRoot, 'index.html'), 'utf8')
await writeFile(path.join(outputRoot, 'index.html'), index.replaceAll('/assets/', `/assets/${release}/`))
await verifyAssetReferences(outputRoot)

console.log(`Built recovered Ghost Lab production UI (${release}) with all referenced assets present.`)
