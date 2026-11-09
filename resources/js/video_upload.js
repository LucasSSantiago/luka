async function postJson(url, payload, csrfToken) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': csrfToken,
    },
    body: JSON.stringify(payload),
  })

  if (response.redirected) {
    throw new Error('Sua sessão pode ter expirado. Entre novamente.')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const validationMessage = Array.isArray(data.errors)
      ? data.errors.map((error) => error.message).join(' ')
      : null

    throw new Error(
      validationMessage || data.message || `A solicitação falhou (HTTP ${response.status}).`
    )
  }

  return data
}

function uploadFile(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`O Azure recusou o envio (HTTP ${xhr.status}).`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Falha de conexão com o Azure. Confira a rede e o CORS.'))
    })

    xhr.addEventListener('timeout', () => {
      reject(new Error('O tempo limite do envio foi atingido.'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('O envio foi interrompido.'))
    })

    xhr.open('PUT', url)
    xhr.timeout = 15 * 60 * 1000
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob')
    xhr.setRequestHeader('x-ms-version', '2023-11-03')
    xhr.setRequestHeader('Content-Type', 'video/mp4')
    xhr.send(file)
  })
}

export default function initVideoUpload() {
  const form = document.querySelector('#video-upload-form')

  if (!form) return

  const button = form.querySelector('button[type="submit"]')
  const message = form.querySelector('#upload-message')
  const progress = form.querySelector('#upload-progress')
  const progressContainer = form.querySelector('#upload-progress-container')
  const csrfToken = form.querySelector('input[name="_csrf"]').value

  let busy = false
  let completed = false

  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    if (busy || completed) return

    busy = true
    button.disabled = true
    form.setAttribute('aria-busy', 'true')
    progress.value = 0
    progressContainer.hidden = true
    message.textContent = ''

    try {
      const file = form.elements.namedItem('videoFile').files[0]

      if (!file || !file.name.toLowerCase().endsWith('.mp4')) {
        throw new Error('Selecione um arquivo MP4.')
      }

      if (file.size <= 0 || file.size > 250_000_000) {
        throw new Error('O arquivo deve ter entre 1 e 250.000.000 bytes.')
      }

      message.textContent = 'Solicitando autorização de upload…'

      const authorization = await postJson(
        form.action,
        {
          title: form.elements.namedItem('title').value,
          description: form.elements.namedItem('description').value.trim() || null,
          originalFilename: file.name,
          contentType: file.type || 'video/mp4',
          sizeBytes: file.size,
        },
        csrfToken
      )

      progressContainer.hidden = false
      message.textContent = 'Enviando vídeo…'

      await uploadFile(authorization.uploadUrl, file, (percentage) => {
        progress.value = percentage
        message.textContent = `Enviando vídeo: ${percentage}%`
      })

      message.textContent = 'Envio recebido. Confirmando o vídeo…'

      const completeUrl = form.dataset.completeUrl.replace(
        'VIDEO_ID',
        encodeURIComponent(authorization.videoId)
      )

      const result = await postJson(completeUrl, {}, csrfToken)

      if (result.status !== 'ready') {
        throw new Error('O envio terminou, mas o vídeo ainda não foi confirmado.')
      }

      completed = true
      progress.value = 100
      message.textContent = 'Vídeo enviado e confirmado com sucesso!'
    } catch (error) {
      message.textContent =
        error instanceof Error ? error.message : 'Não foi possível concluir o upload.'
    } finally {
      busy = false
      button.disabled = completed
      form.setAttribute('aria-busy', 'false')
    }
  })

  button.disabled = false
}
