import bot from './assets/bot.svg'
import user from './assets/user.svg'

const form = document.querySelector('form')
const chatContainer = document.querySelector('#chat_container')
const textarea = document.querySelector('#promptInput')

let loadInterval;

function autoResizeTextarea() {
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`
}

function loader(element) {
  element.textContent = ''

  loadInterval = setInterval(() => {
    element.textContent += '.'

    if (element.textContent === '....') {
      element.textContent = ''
    }
  }, 300)
}

function typeText(element, text) {
  let index = 0

  const interval = setInterval(() => {
    if (index < text.length) {
      element.innerHTML += text.charAt(index)
      index++
    } else {
      clearInterval(interval)
    }
  }, 20)
}

function generateUniqueId() {
  const timestamp = Date.now()
  const randomNumber = Math.random()
  const hexadecimalstring = randomNumber.toString(16)

  return `id-${timestamp}-${hexadecimalstring}`
}

function chatStripe(isAI, value, uniqueId) {
  return `
    <div class="wrapper ${isAI ? 'ai' : 'user'}">
      <div class="chat">
        <div class="profile">
          <img src="${isAI ? bot : user}" alt="${isAI ? 'bot' : 'user'}" />
        </div>
        <div class="message" id="${uniqueId}">${value}</div>
      </div>
    </div>
  `
}

const handleSubmit = async (e) => {
  e.preventDefault()

  const data = new FormData(form)
  const prompt = String(data.get('prompt') || '').trim()

  if (!prompt) {
    textarea.focus()
    return
  }

  chatContainer.innerHTML += chatStripe(false, prompt)

  form.reset()
  autoResizeTextarea()

  const uniqueId = generateUniqueId()
  chatContainer.innerHTML += chatStripe(true, ' ', uniqueId)
  chatContainer.scrollTop = chatContainer.scrollHeight

  const messageDiv = document.getElementById(uniqueId)
  loader(messageDiv)

  try {
    const response = await fetch('http://localhost:5000', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt
      })
    })

    clearInterval(loadInterval)
    messageDiv.innerHTML = ''

    if (response.ok) {
      const responseData = await response.json()
      const parsedData = responseData.bot.trim()
      typeText(messageDiv, parsedData)
    } else {
      let errorMessage = 'Something went wrong'

      try {
        const errorData = await response.json()
        errorMessage = errorData?.error || errorMessage
      } catch (error) {
        const errText = await response.text()
        if (errText) {
          errorMessage = errText
        }
      }

      messageDiv.innerHTML = errorMessage
    }
  } catch (error) {
    clearInterval(loadInterval)
    messageDiv.innerHTML = 'Unable to reach the AI server.'
  }
}

textarea.addEventListener('input', autoResizeTextarea)
textarea.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    form.requestSubmit()
  }
})

form.addEventListener('submit', handleSubmit)
