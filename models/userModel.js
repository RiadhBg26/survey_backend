const mongoose = require('mongoose')
const Schema = mongoose.Schema
const bcrypt = require('bcrypt');
const passport = require('passport');

// Create a schema
const UserSchema = new Schema({
    methods: {
      type: [String],
      required: true
    },
    local: {
      email: {type: String, lowercase: true},
      password: {type: String},
      surveys: [{ type: Schema.Types.ObjectId, ref: 'survey' }],
      answeredSurveys: [{ type: Schema.Types.ObjectId, ref: 'survey' }],
    },
    google: {
      id: {type: String},
      email: {type: String, lowercase: true},
      surveys: [{ type: Schema.Types.ObjectId, ref: 'survey' }],
      answeredSurveys: [{ type: Schema.Types.ObjectId, ref: 'survey' }],
    },
    facebook: {
      id: { type: String},
      email: {type: String,lowercase: true},
      surveys: [{ type: Schema.Types.ObjectId, ref: 'survey' }],
      answeredSurveys: [{ type: Schema.Types.ObjectId, ref: 'survey' }],
    }
  });
  

UserSchema.pre('save', async function (next) {
    try {
        console.log('entered');
        if (!this.methods.includes('local')) {
          next();
        }
          //check if the user has been modified to know if the password has already been hashed
        if (!this.isModified('local.password')) {
        next();
      }
        // const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(this.local.password, 10)
        this.local.password = hashedPassword
        next()

    } catch (error) {
        return next(error)
    }
});

UserSchema.methods.isValidPassword = async function(password) {
    try{
        return await bcrypt.compare(password, this.local.password)

    }catch(error) {
         throw new Error(error)
    }
};
const user = mongoose.model('user', UserSchema)
module.exports = user