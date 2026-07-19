#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const repoRoot = path.resolve(new URL(import.meta.url).pathname, '..', '..')
const inPath = path.join(repoRoot, 'public', 'playlist.json')
const outPath = path.join(repoRoot, 'public', 'playlist.m3u')

function safe(v){ return v==null ? '' : String(v).replace(/"/g, '') }

const raw = fs.readFileSync(inPath, 'utf8')
let data
try{
  data = JSON.parse(raw)
}catch(e){
  console.error('Failed to parse JSON:', e.message)
  process.exit(2)
}

const lines = ['#EXTM3U']
for(const item of data){
  const attrs = []
  attrs.push(`tvg-id=\"${safe(item.name)}\"`)
  attrs.push(`tvg-name=\"${safe(item.name)}\"`)
  attrs.push(`tvg-logo=\"${safe(item.logo)}\"`)
  attrs.push(`group-title=\"${safe(item.group)}\"`)
  if(item.country) attrs.push(`country=\"${safe(item.country)}\"`)
  lines.push(`#EXTINF:-1 ${attrs.join(' ')},${safe(item.name)}`)
  lines.push(safe(item.url))
}

fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
console.log('Generated', outPath)
