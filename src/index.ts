import Busboy from 'busboy'
import set from 'lodash/set'
import get from 'lodash/get'
import { IncomingMessage } from 'http'

export class BusboyFile {
  filename?: string
  data?: Buffer
  size?: number
  mimetype?: string
  encoding?: string
  ext?: string
  name?: string
  path?: string
  buffer?: Buffer
  width?: number
  height?: number
  constructor(filename?: string, data?: Buffer, size?: number, mimetype?: string, encoding?: string) {
    this.filename = filename
    this.data = data
    this.buffer = data
    this.size = size
    this.mimetype = mimetype
    this.encoding = encoding
  }
}

function parseBody<T = {}>(req: IncomingMessage): Promise<T | undefined> {
  return new Promise(resolve => {
    const body = {}

    if (!req.headers['content-type']) {
      return resolve(undefined)
    }

    const busboy = new Busboy({
      headers: req.headers,
    })

    const setBody = (key: string, value: any) => {
      if (key?.includes('__proto__')) { return }

      const currentValue = get(body, key)

      if (currentValue === undefined) {
        set(body, key, value)
      } else if (Array.isArray(currentValue)) {
        set(body, key, currentValue.concat(value))
      } else {
        set(body, key, [currentValue, value])
      }
    }

    busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, filename: string, encoding: string, mimetype: string) => {
      if (fieldname?.includes('__proto__')) { return }
      const chunks: Buffer[] = []
      let size = 0
      file.on('data', data => {
        chunks.push(data)
        size += data.length
      })
      file.on('end', () => {
        const value = new BusboyFile(filename, Buffer.concat(chunks), size, mimetype, encoding)
        setBody(fieldname, value)
      })
    })

    busboy.on('field', (fieldname: string, value: any, fieldnameTruncated: boolean, valTruncated: boolean, encoding: string, mimetype: string) => {
      try {
        value = JSON.parse(value)
      } catch (e) { }
      setBody(fieldname, value)
    })

    busboy.on('finish', () => {
      resolve(body as T)
    })

    req.pipe(busboy)
  })
}

export default parseBody