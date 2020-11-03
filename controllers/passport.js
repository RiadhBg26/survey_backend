const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const User = require('../models/userModel')

passport.use('jwt', new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromHeader('authorization'),
    secretOrKey: 'secret_key'
}, async function (payload, done) {
    try {
        //find the user specified in token
        const user = await User.findById(payload.sub)
        //if user doesen't exist handle it
        if (!user) {
            return done(null, false)
        };
        //otherwise return the user
        return done(null, user)

    } catch (error) {
        return done(error, false)
    };
}));

//login with passport-local-strategy
passport.use('local', new LocalStrategy({
    usernameField: 'email'
}, async function (email, password, done) {
    try {

        const user = await User.findOne({ email });

        if (!user) {
            return done(null, false, { error: 'user not found in db' })
        }

        const validate = await user.isValidPassword(password)
        if (!validate) {
            return done(null, false, { error: 'passwords dont match' })
        }
        return done(null, user, { message: `user with email ${user.email} logged in successfully` })
        
    } catch (error) {
        return done(error,false)
    }

}))