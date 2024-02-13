const express = require('express')
const User = require('../models/User')
const bcrypt = require('bcrypt')
const router = express.Router()
const crypto = require('crypto')
const { promisify } = require('util')
const nodemailer = require('nodemailer')
const { google }= require('googleapis')
const fs  = require('fs')
const dotenv = require('dotenv')
const path = require('path')


dotenv.config({path: './config/.env'})

router.get('/register', (req, res) => {
     res.json({"message":"register"});
})

//register user
router.post('/register', async (req, res) => {
    const {email,password,password2} = req.body
    try {
        if (!email || !password || !password2) {
            res.status(400).json({message:"all field are required"})
        }
        else if (password !== password2) {
            res.status(400).json({message:"password does not match"})
        }
        else if (password < 6 || password > 12) {
            res.status(400).json({message:"password should be between 6-12 characters"})
        }
        else{
            // check if the account exists
            let user = await User.findOne({email})
            if (user) {
                res.status(400).json({message: "user already exists"})
            }
            else{
                // hash password before inserting to mongo
                const salt = await bcrypt.genSalt(10)
                const hashPassword = await bcrypt.hash(password,salt)

                //create new user
                user = await User.create({
                    email,
                    password: hashPassword
                })

                res.status(201).json({
                    email: user.email,
                    password: user.password
                })
            }
        }
    } catch (error) {
        console.log(error)
    }
})

router.get('/login', (req, res) => {
    res.status(200).json({
        message: "successfully login"
    })
})

//login user
router.post('/login', async (req, res) => {
    const {email,password} = req.body

    try {
        if (!email || !password) {
            res.status(400).json({message: "all fields are required"})
        }
        else{
            //check if user exists
            let user = await User.findOne({email})
            if (!user) {
                res.status(404).json({message: "user does not exist"})
            }
            else{
                // compare password supplied with password in db
                let isMatch = await bcrypt.compare(password,user.password)
                //password mismatch
                if (!isMatch) {
                    res.status(400).json({message: "password incorrect"})
                }
                else{
                    req.session.user = user;
                    res.status(200).json({message: `welcome ${user.email}`})
                }
            }
        }
    } catch (error) {
        console.log(error)
    }
})

//create a new Oauth2 client
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
)

// Generate secure token function

const randomBytesAsync = promisify(crypto.randomBytes)

async function generateSecureToken(len) {
    try {
        const randomBytes = await randomBytesAsync(len)
        const token = randomBytes.toString('hex')
        return token
    } catch (error) {
        console.log(error)
    }
}

//initialize nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type:'OAuth2',
        user: process.env.EMAIL_ADDRESS,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN
    },
    debug: true
})




// generate an oAuth2 URL for user consent
router.get('/auth/google', (req, res) => { 
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://mail.google.com/'
    })
    res.status(200).json({authUrl})
})



router.get('/auth/google/callback', async(req, res) => {
    const code = req.query.code
    console.log(code)
    try {
        const { tokens } = await oauth2Client.getToken(code)
        console.log(tokens)
        const refreshToken = tokens.refresh_token
        process.env.REFRESH_TOKEN = refreshToken

        //fs.writeFileSync('./config/.env',`REFRESH_TOKEN=${refreshToken}`)
        function updateRefreshTokenInEnvFile(RT){
            //file path
            const envFilePath = path.resolve(__dirname, '../config/.env')
            console.log(envFilePath)

            //read content of the .env file
            let envFileContent = fs.readFileSync(envFilePath, 'utf8')

            //split the content into lines
            const lines = envFileContent.split('\n')

            //find and update the line containing the REFRESH_TOKEN variable
            let updatedContent = '';
            lines.forEach(line=> {
                if (line.startsWith('REFRESH_TOKEN')) {
                    updatedContent += `REFRESH_TOKEN=${RT}`
                } else {
                    updatedContent += `${line}\n`
                }
            })
            fs.writeFileSync(envFilePath, updatedContent, 'utf8')
        }
        const newRt = refreshToken
        updateRefreshTokenInEnvFile(newRt)
        // console.log(refreshToken)
        // console.log(process.env.REFRESH_TOKEN)
        // fs.appendFileSync('./config/.env', `\nREFRESH_TOKEN=${refreshToken}`)

        // update transporter with the new access token
        globalThis.newTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: "OAuth2",
                user: process.env.EMAIL_ADDRESS,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken:tokens.access_token
            }
        })
        
        console.log(newTransporter)
        console.log(transporter)
        res.status(200).json({message: "refresh token obtained successfully"})
    } catch (error) {
        console.log(error)
    }
})

//forgot password
router.post('/forgot-password', async (req, res) => {
    const {email} = req.body;
    
    try {
        if (!email) {
            res.status(400).json({message: "please enter an email address"})
        }
        //check if user exists
        let user = await User.findOne({email})
        if (!user) {
            res.status(404).json({message: "user not found"})
        }
        else{
            //generate a unique token for password reset
            const resetToken = await generateSecureToken(32)
            user.resetPasswordToken = resetToken
            user.resetPasswordExpires = new Date(Date.now() + 3600000)
            await user.save()

            // send the password reset mail
            const mailOptions = {
                from: process.env.EMAIL_ADDRESS,
                to:user.email,
                subject: "Password Reset Request",
                text: `Click the following link to reset your password: http://localhost:9000/api/reset-password/${resetToken}`
            }
            newTransporter.sendMail(mailOptions,(err) => {
                if (err) {
                    console.log(err)
                }
                else{
                    res.status(200).json({message:'password reset email sent'})
                    console.log('password reset email sent')
                }
            })
        }
    } catch (error) {
        console.log(error)
    }
})

router.put('/reset-password/:resetToken', async (req,res) => {

    try {
        const {password1,password2} = req.body
        const resetToken = req.params.resetToken
        if (!password1 || !password2) {
            res.status(400).json({message: "all fields are required"})
        } else if (password1 !== password2) {
            res.status(400).json({message: "password do not match"})
        } else {
            let user = await User.findOne({resetPasswordToken:resetToken})
            if (!user) {
                res.status(404).json({message: "token does not exist"})
            }
            else{
                //hash new password
                const genSalt2 = await bcrypt.genSalt(10)
                const hashPassword2 = await bcrypt.hash(password1,genSalt2) 
                user.password = hashPassword2;
                user.resetPasswordToken = undefined
                await user.save()

                res.status(200).json({message: "password updated successfully"})
    
            }
        }
        
    } catch (error) {
        console.log(error)
    }
})
module.exports = router