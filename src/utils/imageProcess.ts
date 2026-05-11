const MAX_DIMENSION = 1600
const QUALITY = 0.85

export interface ProcessedImage {
  base64: string
  format: 'jpg'
}

export async function processReceiptImage(file: File): Promise<ProcessedImage> {
  const dataUrl = await readAsDataURL(file)
  const img = await loadImage(dataUrl)
  const { width, height } = scaledDimensions(img.naturalWidth, img.naturalHeight, MAX_DIMENSION)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context를 생성할 수 없습니다')
  ctx.drawImage(img, 0, 0, width, height)

  const jpegDataUrl = canvas.toDataURL('image/jpeg', QUALITY)
  const base64 = jpegDataUrl.replace(/^data:image\/\w+;base64,/, '')
  return { base64, format: 'jpg' }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('이미지 파일을 읽지 못했습니다'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지를 디코딩하지 못했습니다'))
    img.src = src
  })
}

function scaledDimensions(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h }
  const ratio = w >= h ? max / w : max / h
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}
