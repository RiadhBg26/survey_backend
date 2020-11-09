const mongoose = require('mongoose')
const Schema = mongoose.Schema
const bcrypt = require('bcrypt');
const passport = require('passport');

const UserSchema = new Schema({
    email: { type: String, required: true },
    password: { type: String },
    surveys: [{ type: Schema.Types.ObjectId, ref: 'survey' }],
    answeredSurveys: [{ type: Schema.Types.ObjectId, ref: 'survey' }]
})

UserSchema.pre('save', async function (next) {
    try {
        // const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(this.password, 10)
        this.password = hashedPassword
        next()

    } catch (error) {
        return next(error)
    }
});

UserSchema.methods.isValidPassword = async function(password) {
    try{
        return await bcrypt.compare(password, this.password)

    }catch(error) {
         throw new Error(error)
    }
};
const user = mongoose.model('user', UserSchema)
module.exports = user