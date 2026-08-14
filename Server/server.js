import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import OpenAI from 'openai'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: resolve(__dirname, '.env') })

const provider = process.env.LLM_PROVIDER || (process.env.NVIDIA_API_KEY ? 'nvidia' : 'openai')
const apiKey = provider === 'nvidia' ? process.env.NVIDIA_API_KEY : process.env.OPENAI_API_KEY
const baseURL = provider === 'nvidia'
    ? process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'
    : process.env.OPENAI_BASE_URL
const model = provider === 'nvidia'
    ? process.env.NVIDIA_MODEL || 'nvidia/nemotron-4-340b-instruct'
    : process.env.OPENAI_MODEL || 'gpt-4.1-mini'

const openai = apiKey ? new OpenAI({ apiKey, baseURL }) : null

const app = express()
app.use(cors())
app.use(express.json());

app.get('/', async (req, res) => {
    res.status(200).send({
        message: 'Hello from AI_Support',
    })
})

app.post('/', async (req, res) => {
    try {
        if (!openai) {
            return res.status(500).send({
                error: provider === 'nvidia'
                    ? 'NVIDIA_API_KEY is missing. Add it to Server/.env and restart the server.'
                    : 'OPENAI_API_KEY is missing. Add it to Server/.env and restart the server.',
            })
        }

        const prompt = req.body.prompt;

        const response = await openai.chat.completions.create({
            model,
            messages: [{ role: 'user', content: prompt }],
        });

        res.status(200).send({
            bot: response.choices?.[0]?.message?.content || ''
        })
    } catch (error) {
        console.log(error);
        const authFailed = error?.status === 401
        const quotaExceeded = error?.code === 'credit_balance_exhausted' || error?.code === 'insufficient_quota'

        if (authFailed) {
            return res.status(401).send({
                error: provider === 'nvidia'
                    ? `NVIDIA_API_KEY is invalid, missing, or not authorized for the model ${model}. Use a valid NVIDIA key and a model your account can access in Server/.env, then restart the server.`
                    : 'OPENAI_API_KEY is invalid or missing. Add a valid key to Server/.env and restart the server.',
            })
        }

        if (quotaExceeded) {
            return res.status(200).send({
                bot: provider === 'nvidia'
                    ? 'NVIDIA API credits are exhausted. Add credits to your NVIDIA account to continue chatting.'
                    : 'OpenAI billing credits are exhausted. Add credits to your account to continue chatting.',
            })
        }

        res.status(error?.status || 500).send({ error: `The request failed while talking to ${provider === 'nvidia' ? 'NVIDIA' : 'OpenAI'}.` })
    }
})


app.listen(5000, ()=> console.log('Server is running on port http://localhost:5000'));