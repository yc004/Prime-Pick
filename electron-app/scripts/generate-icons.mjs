import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'
import { PNG } from 'pngjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const srcSvgPath = path.resolve(projectRoot, '..', 'sources', 'logo', 'PrimePick.svg')
const outPublicPng = path.join(projectRoot, 'public', 'icon.png')
const outBuildDir = path.join(projectRoot, 'build')
const outBuildPng = path.join(outBuildDir, 'icon.png')
const outBuildIco = path.join(outBuildDir, 'icon.ico')

fs.mkdirSync(outBuildDir, { recursive: true })

const svg = fs.readFileSync(srcSvgPath, 'utf-8')
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 512 },
  background: 'transparent',
})
const rendered = resvg.render()
const pngData = rendered.asPng()

const decoded = PNG.sync.read(pngData)
const size = Math.max(decoded.width, decoded.height)
const square = new PNG({ width: size, height: size })
PNG.bitblt(decoded, square, 0, 0, decoded.width, decoded.height, Math.floor((size - decoded.width) / 2), Math.floor((size - decoded.height) / 2))
const squarePng = PNG.sync.write(square)

fs.writeFileSync(outPublicPng, squarePng)
fs.writeFileSync(outBuildPng, squarePng)

const ico = await pngToIco(squarePng)
fs.writeFileSync(outBuildIco, ico)

process.stdout.write(
  JSON.stringify(
    {
      ok: true,
      src: srcSvgPath,
      outputs: [outPublicPng, outBuildPng, outBuildIco],
    },
    null,
    2,
  ) + '\n',
)
