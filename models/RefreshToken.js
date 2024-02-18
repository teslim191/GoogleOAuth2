const mongoose = require('mongoose')

const RefreshTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    refresh_token: {
        type: String,
        required: true

    }
},{
    timestamps: true
})

module.exports = mongoose.model('RefreshToken',RefreshTokenSchema)