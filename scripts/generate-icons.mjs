import { deflateSync } from 'zlib'
import { writeFileSync } from 'fs'

function makeCrcTable() {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
}
const CRC = makeCrcTable()

function crc32(buf) {
  let v = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) v = CRC[(v ^ buf[i]) & 0xFF] ^ (v >>> 8)
  return (v ^ 0xFFFFFFFF) >>> 0
}

function u32(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n)
  return b
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  return Buffer.concat([u32(data.length), t, data, u32(crc32(Buffer.concat([t, data])))])
}

function solidPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = chunk('IHDR', Buffer.concat([u32(size), u32(size), Buffer.from([8, 2, 0, 0, 0])]))
  const row = Buffer.alloc(1 + size * 3)
  for (let x = 0; x < size; x++) {
    row[1 + x * 3]     = r
    row[1 + x * 3 + 1] = g
    row[1 + x * 3 + 2] = b
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row))
  const idat = chunk('IDAT', deflateSync(raw))
  const iend = chunk('IEND', Buffer.alloc(0))
  return Buffer.concat([sig, ihdr, idat, iend])
}

writeFileSync('public/icons/icon-192.png', solidPNG(192, 99, 102, 241))
writeFileSync('public/icons/icon-512.png', solidPNG(512, 99, 102, 241))
console.log('✓ Icons generated: public/icons/icon-192.png, icon-512.png')
