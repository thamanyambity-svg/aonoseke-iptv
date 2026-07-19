#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { XMLParser } from 'fast-xml-parser'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['"`]/g, '')
}

function escapeAttr(value) {
  return String(value ?? '').replace(/"/g, '"')
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value).trim())
}

function arrayify(value) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function parseArg(rawArg) {
  const parts = rawArg.replace(/^--/, '').split('=')
  const key = parts[0]
  const value = parts.slice(1).join('=')
  return { key, value }
}

function parseArgs(argv) {
  const options = {
    input: 'public/playlist.json',
    output: 'public/playlist.iptv.m3u',
    xmltv: undefined,
    country: undefined,
    group: undefined,
    publicUrl: undefined,
    overwrite: false,
    help: false,
  }

  for (const rawArg of argv) {
    if (rawArg === '--help' || rawArg === '-h') {
      options.help = true
      continue
    }

    const { key, value } = parseArg(rawArg)
    switch (key) {
      case 'input':
        options.input = value || options.input
        break
      case 'output':
        options.output = value || options.output
        break
      case 'xmltv':
        options.xmltv = value || undefined
        break
      case 'country':
        options.country = value || undefined
        break
      case 'group':
        options.group = value || undefined
        break
      case 'public-url':
        options.publicUrl = value || undefined
        break
      case 'overwrite':
        options.overwrite = true
        break
      default:
        console.warn(`Ignoring unknown option: ${rawArg}`)
    }
  }

  return options
}

function printUsage() {
  console.log(`Usage: node scripts/generate-m3u-iptv.mjs [options]\n\nOptions:\n  --input=public/playlist.json      Source JSON playlist\n  --output=public/playlist.iptv.m3u Output M3U path\n  --xmltv=path-or-url               XMLTV guide for tvg-id/logo enrichment\n  --country=FR                      Filter channels by country ISO code\n  --group=Afrique                   Filter channels by group title\n  --public-url=https://example.com  Optional base URL to print final playlist URL\n  --overwrite                       Overwrite the target file if it exists\n  --help, -h                        Print this help message\n`)
}

async function loadText(source) {
  if (isHttpUrl(source)) {
    const response = await fetch(source)
    if (!response.ok) {
      throw new Error(`Unable to fetch XMLTV from ${source}: ${response.status}`)
    }
    return await response.text()
  }
  return await fs.readFile(path.resolve(repoRoot, source), 'utf8')
}

async function loadXmltv(source) {
  const content = await loadText(source)
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    ignoreDeclaration: true,
  })
  const xml = parser.parse(content)
  const tv = xml.tv ?? xml.TV
  if (!tv) return []

  const channels = arrayify(tv.channel)
  return channels.map((channel) => {
    const id = channel['@_id'] ?? ''
    const names = arrayify(channel['display-name']).map((value) => normalize(value))
    const icon = typeof channel.icon === 'object' ? channel.icon['@_src'] || '' : ''
    return { id, names, icon }
  })
}

function matchXmlChannel(item, xmlChannels) {
  const normalizedName = normalize(item.name)
  if (!normalizedName) return undefined

  for (const channel of xmlChannels) {
    if (channel.id && slug(channel.id) === slug(normalizedName)) return channel
    if (channel.names.some((name) => name === normalizedName)) return channel
  }
  return undefined
}

function filterChannel(item, countryFilter, groupFilter) {
  if (countryFilter) {
    if (String(item.country ?? '').trim().toLowerCase() !== countryFilter.toLowerCase()) {
      return false
    }
  }
  if (groupFilter) {
    if (!String(item.group ?? '').toLowerCase().includes(groupFilter.toLowerCase())) {
      return false
    }
  }
  return true
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function resolveOutputPath(basePath, overwrite) {
  if (overwrite) return basePath
  if (!(await pathExists(basePath))) return basePath
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return basePath.replace(/\.m3u$/, `.${timestamp}.m3u`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printUsage()
    return
  }

  const playlistPath = path.join(repoRoot, options.input)
  const raw = await fs.readFile(playlistPath, 'utf8')
  const playlist = JSON.parse(raw)
  if (!Array.isArray(playlist)) {
    throw new Error('Playlist JSON must be an array')
  }

  const xmlChannels = options.xmltv ? await loadXmltv(options.xmltv) : []

  const entries = playlist
    .filter((item) => Boolean(item && item.url && isHttpUrl(item.url)))
    .filter((item) => filterChannel(item, options.country, options.group))
    .map((item) => {
      const xmlMatch = matchXmlChannel(item, xmlChannels)
      const tvgId = xmlMatch?.id || slug(item.name)
      const logo = item.logo || xmlMatch?.icon || ''
      return { ...item, tvgId, logo }
    })

  if (entries.length === 0) {
    throw new Error('No channels remain after filtering. Verify your input and filters.')
  }

  const m3uLines = ['#EXTM3U']
  for (const item of entries) {
    const attrs = [
      `tvg-id="${escapeAttr(item.tvgId)}"`,
      `tvg-name="${escapeAttr(item.name)}"`,
    ]
    if (item.logo) attrs.push(`tvg-logo="${escapeAttr(item.logo)}"`)
    if (item.group) attrs.push(`group-title="${escapeAttr(item.group)}"`)
    if (item.country) attrs.push(`country="${escapeAttr(item.country)}"`)
    m3uLines.push(`#EXTINF:-1 ${attrs.join(' ')},${escapeAttr(item.name)}`)
    m3uLines.push(item.url)
  }

  const outputPath = await resolveOutputPath(path.join(repoRoot, options.output), options.overwrite)
  await fs.writeFile(outputPath, `${m3uLines.join('\n')}\n`, 'utf8')

  console.log(`Generated M3U playlist: ${outputPath}`)
  if (options.publicUrl) {
    const relative = path.relative(repoRoot, outputPath).replace(/\\/g, '/')
    console.log(`Public URL: ${options.publicUrl.replace(/\/+$/,'')}/${relative}`)
  }
  console.log(`Channels written: ${entries.length}`)
}

main().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})
