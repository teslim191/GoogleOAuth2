const express = require("express")
const connectDB = require('./config/db')
const dotenv = require('dotenv')
const app = express()
const session = require('express-session')
const mongoStore = require('connect-mongo')


//environment variables
dotenv.config({path: './config/.env'})

// parsing of data in json and form field
app.use(express.json())
app.use(express.urlencoded({extended:false})) 

//db connection
connectDB()

//initialize session
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: mongoStore.create({mongoUrl: process.env.MONGO_URI})
}))


//initialize routes
app.use('/api', require('./routes/api'))


const PORT = process.env.PORT || 9000

app.listen(PORT, () => console.log(`server is listening on port ${PORT}`))