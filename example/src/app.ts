import express from 'express'
import dotenv from 'dotenv'
dotenv.config()

import TodoRouter from './routes/todo'
import BodyParser from 'body-parser'

const app = express()

app.use(BodyParser.json())
app.use(BodyParser.urlencoded({extended: false}))
app.use(TodoRouter)

app.listen(process.env.PORT, () => {
    console.log(`Node todo app is running on ${3000}`)
})
